import { standards } from '@aurora-is-near/intents-connect';
import { Address } from '@ton/core';
import {
  CHAIN,
  isWalletInfoCurrentlyInjected,
  isWalletInfoRemote,
  TonConnect,
  type TonConnectError,
  type Wallet,
  type WalletInfo,
} from '@tonconnect/sdk';

import { callTonWallet, toTonWalletError } from '@/ton/errors';
import { prefixedStorage } from '@/ton/storage';
import type { TonConnectClient, TonExtension, TonPeer } from '@/ton/types';

/** What the client needs of `TonConnect`; tests pass a stub. */
export type TonConnectLike = Pick<
  TonConnect,
  | 'connected'
  | 'wallet'
  | 'getWallets'
  | 'onStatusChange'
  | 'connect'
  | 'restoreConnection'
  | 'disconnect'
  | 'signData'
  | 'sendTransaction'
>;

export type TonConnectClientOptions = {
  /**
   * Public URL of your `tonconnect-manifest.json` (url, name, iconUrl).
   * Wallets fetch it, so it must be reachable from a phone.
   */
  manifestUrl: string;
  /**
   * Prefixes TON Connect's storage keys, which are otherwise fixed: set it
   * when another TON Connect app may share the origin.
   */
  storagePrefix?: string;
  /** Builds the `TonConnect` instance; for tests. */
  createConnector?: () => TonConnectLike;
};

const signsText = (wallet: Wallet) =>
  wallet.device.features.some(
    (feature) =>
      typeof feature === 'object' &&
      feature.name === 'SignData' &&
      feature.types.includes('text'),
  );

const toPeer = (wallet: Wallet, infos: readonly WalletInfo[]): TonPeer => {
  const { account, device } = wallet;
  const info = infos.find((candidate) => candidate.appName === device.appName);

  return {
    address: Address.parseRaw(account.address).toString({
      bounceable: false,
      urlSafe: true,
    }),
    rawAddress: account.address,
    publicKey: account.publicKey
      ? `ed25519:${standards.toBase58(standards.fromHex(account.publicKey))}`
      : undefined,
    appName: device.appName,
    name: info?.name ?? device.appName,
    icon: info?.imageUrl,
    jsBridgeKey:
      wallet.provider === 'injected' && info && 'jsBridgeKey' in info
        ? info.jsBridgeKey
        : undefined,
    signsText: signsText(wallet),
    mainnet: account.chain === CHAIN.MAINNET,
  };
};

/**
 * One TON Connect session, for TON wallet extensions and phones alike
 * (TON Connect keeps one wallet at a time). Nothing loads until it's first
 * used. The session persists, so a connected wallet survives a reload
 * (`getPeer`).
 *
 * `@ton/core` needs a global `Buffer` when it loads: provide one in the
 * browser (e.g. the `buffer` package).
 */
export const createTonConnectClient = ({
  manifestUrl,
  storagePrefix = '',
  createConnector,
}: TonConnectClientOptions): TonConnectClient => {
  let connector: TonConnectLike | undefined;
  let walletList: Promise<WalletInfo[]> | undefined;
  let restored: Promise<TonPeer | null> | undefined;
  let peer: TonPeer | null = null;
  let pairing: AbortController | undefined;
  const listeners = new Set<(next: TonPeer | null) => void>();
  const errorListeners = new Set<(error: TonConnectError) => void>();
  const endListeners = new Set<() => void>();

  /** The wallets list (names, icons, bridges), fetched once. */
  const walletInfos = (ton: TonConnectLike) => {
    walletList ??= ton.getWallets().catch(() => {
      walletList = undefined;

      return [];
    });

    return walletList;
  };

  const update = async (ton: TonConnectLike, wallet: Wallet | null) => {
    const previous = peer;

    peer = wallet ? toPeer(wallet, await walletInfos(ton)) : null;
    listeners.forEach((listener) => listener(peer));

    if (previous && !peer) {
      endListeners.forEach((listener) => listener());
    }
  };

  const getConnector = (): TonConnectLike => {
    if (!connector) {
      const ton =
        createConnector?.() ??
        new TonConnect({
          manifestUrl,
          storage: prefixedStorage(storagePrefix),
        });

      ton.onStatusChange(
        (wallet) => {
          void update(ton, wallet);
        },
        (error) => errorListeners.forEach((listener) => listener(error)),
      );
      connector = ton;
    }

    return connector;
  };

  const onChange = (listener: (next: TonPeer | null) => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  /** The next connected wallet, or the error the connection ends with. */
  const nextPeer = (signal?: AbortSignal) =>
    new Promise<TonPeer>((resolve, reject) => {
      const cleanup: (() => void)[] = [];
      const done = () => cleanup.forEach((step) => step());

      const onPeer = (next: TonPeer | null) => {
        if (next) {
          done();
          resolve(next);
        }
      };

      const onError = (error: TonConnectError) => {
        done();
        reject(toTonWalletError(error));
      };

      listeners.add(onPeer);
      errorListeners.add(onError);
      cleanup.push(
        () => listeners.delete(onPeer),
        () => errorListeners.delete(onError),
      );
      signal?.addEventListener('abort', () => {
        done();
        reject(new Error('The pairing was abandoned'));
      });
    });

  const getPeer = () => {
    restored ??= (async () => {
      const ton = getConnector();

      await ton.restoreConnection().catch(() => undefined);

      if (ton.wallet && !peer) {
        await update(ton, ton.wallet);
      }

      return peer;
    })();

    return restored;
  };

  /** One wallet at a time: a new connection replaces the old one. */
  const replaceSession = async () => {
    const ton = getConnector();

    await getPeer();

    if (ton.connected) {
      await ton.disconnect().catch(() => undefined);
    }

    return ton;
  };

  const requirePeer = () => {
    if (!peer) {
      throw new Error('No TON wallet is connected');
    }

    return peer;
  };

  return {
    getPeer,
    currentPeer: () => peer,
    onChange,
    onSessionEnd: (listener) => {
      endListeners.add(listener);

      return () => {
        endListeners.delete(listener);
      };
    },
    listExtensions: async (): Promise<TonExtension[]> =>
      (await walletInfos(getConnector()))
        .filter(isWalletInfoCurrentlyInjected)
        .map(({ appName, name, imageUrl, jsBridgeKey }) => ({
          appName,
          name,
          icon: imageUrl,
          jsBridgeKey,
        })),
    connectExtension: async (jsBridgeKey) => {
      const ton = await replaceSession();
      const connected = nextPeer();

      ton.connect({ jsBridgeKey });

      return connected;
    },
    pair: async (onUri) => {
      pairing?.abort();

      const controller = new AbortController();

      pairing = controller;

      const ton = await replaceSession();
      const bridges = [
        ...new Set(
          (await walletInfos(ton))
            .filter(isWalletInfoRemote)
            .map(({ bridgeUrl }) => bridgeUrl),
        ),
      ].map((bridgeUrl) => ({ bridgeUrl }));

      const connected = nextPeer(controller.signal);

      onUri(ton.connect(bridges, { signal: controller.signal }));

      try {
        return await connected;
      } finally {
        if (pairing === controller) {
          pairing = undefined;
        }
      }
    },
    abortPairing: async () => {
      pairing?.abort();
      pairing = undefined;
    },
    disconnect: async () => {
      const ton = getConnector();

      if (ton.connected) {
        await ton.disconnect().catch(() => undefined);
      }
    },
    signText: async (text) => {
      const { rawAddress } = requirePeer();
      const { signature, address, domain, timestamp } = await callTonWallet(
        () =>
          getConnector().signData({
            type: 'text',
            text,
            network: CHAIN.MAINNET,
            from: rawAddress,
          }),
      );

      return { signature, address, domain, timestamp };
    },
    sendTransaction: async ({ validUntil, messages }) => {
      const { rawAddress } = requirePeer();

      return callTonWallet(() =>
        getConnector().sendTransaction({
          validUntil,
          network: CHAIN.MAINNET,
          from: rawAddress,
          messages,
        }),
      );
    },
  };
};
