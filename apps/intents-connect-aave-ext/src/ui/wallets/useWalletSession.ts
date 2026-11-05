import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import {
  toWalletConnectConnector,
  type WalletConnectClient,
  type WalletConnectPeer,
} from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import {
  connectDetectedWallet,
  type DetectedFamily,
  type DetectedWallet,
  disconnectDetectedWallet,
  forgetWalletConnection,
  type UnsupportedReason,
  type WalletSource,
} from '@aurora-is-near/intents-connect-wallet/detect';
import {
  toWalletConnector,
  type WalletConnectorOptions,
} from '@aurora-is-near/intents-connect-wallet/detect/connector';
import { useDetectedWallets } from '@aurora-is-near/intents-connect-wallet/detect/react';
import {
  type TonConnectClient,
  type TonPeer,
  toTonWalletConnector,
} from '@aurora-is-near/intents-connect-wallet/ton';

/** The wallet the user pays from, remembered across reloads. */
const CHOICE_KEY = 'aurora-intents.wallet';
/**
 * Restoring a WalletConnect session connects to its relay, so it is only
 * tried once a phone was paired here.
 */
const PAIRED_KEY = 'aurora-intents.walletconnect.paired';

type Choice =
  | { kind: 'detected'; id: string }
  | { kind: 'walletconnect' }
  | { kind: 'ton' };

/** The TON session's wallet when it's a phone: extensions are detected. */
const phoneOf = (peer: TonPeer | null) =>
  peer && !peer.jsBridgeKey ? peer : null;

const readItem = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeItem = (key: string, value: string | null) => {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Not remembered: the next visit starts from the wallet list.
  }
};

const readChoice = (): Choice | null => {
  try {
    const choice = JSON.parse(readItem(CHOICE_KEY) ?? 'null') as Choice | null;

    return choice?.kind === 'walletconnect' ||
      choice?.kind === 'ton' ||
      (choice?.kind === 'detected' && typeof choice.id === 'string')
      ? choice
      : null;
  } catch {
    return null;
  }
};

/** The wallet the modal runs with. */
export type ActiveWallet = {
  /** Changes with the wallet or its account. */
  key: string;
  name: string;
  icon?: string;
  family: DetectedFamily;
  address: string;
  /** Paired by QR, on the user's phone. */
  mobile: boolean;
  connector: WalletConnector;
};

export type WalletSession = {
  /** False until detection settled and a paired phone was restored. */
  ready: boolean;
  wallets: readonly DetectedWallet[];
  /** The paired EVM phone wallet, chosen or not. */
  peer: WalletConnectPeer | null;
  /** The paired TON phone wallet, chosen or not. */
  tonPeer: TonPeer | null;
  active: ActiveWallet | null;
  /** Why the chosen wallet can't be used, e.g. NEAR without a public key. */
  unsupportedReason?: UnsupportedReason;
  /**
   * Picks a browser wallet, through its own prompt if it shares no account.
   * `signal` calls the prompt off: nothing is picked, and a late answer is
   * ignored.
   */
  select: (
    wallet: DetectedWallet,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
  /** Picks the EVM phone wallet: the one just paired, or the restored one. */
  selectPhone: (peer: WalletConnectPeer) => void;
  /** Picks the TON phone wallet. */
  selectTonPhone: (peer: TonPeer) => void;
  /** Stops paying from the active wallet. */
  disconnect: () => Promise<void>;
};

/**
 * Which wallet pays: a browser wallet found by detection, or a phone paired
 * over WalletConnect (EVM) or TON Connect (TON). Nothing prompts until the
 * user picks a wallet that shares no account with the page yet.
 */
export const useWalletSession = ({
  walletConnect,
  tonConnect,
  connectorOptions,
  walletSources,
}: {
  walletConnect?: WalletConnectClient;
  tonConnect?: TonConnectClient;
  connectorOptions?: WalletConnectorOptions;
  walletSources?: readonly WalletSource[];
}): WalletSession => {
  const detection = useDetectedWallets({ sources: walletSources });
  const { refresh } = detection;
  const [choice, setChoiceState] = useState<Choice | null>(readChoice);
  const [peer, setPeer] = useState<WalletConnectPeer | null>(null);
  const [peerReady, setPeerReady] = useState(
    () => !walletConnect || readItem(PAIRED_KEY) !== '1',
  );

  const [tonPeer, setTonPeer] = useState<TonPeer | null>(null);
  const [tonReady, setTonReady] = useState(!tonConnect);

  const setChoice = useCallback((next: Choice | null) => {
    setChoiceState(next);
    writeItem(CHOICE_KEY, next && JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!walletConnect || readItem(PAIRED_KEY) !== '1') {
      return undefined;
    }

    let live = true;

    walletConnect.getPeer().then(
      (restored) => {
        if (live) {
          setPeer(restored);
          setPeerReady(true);
          writeItem(PAIRED_KEY, restored ? '1' : null);
        }
      },
      () => {
        if (live) {
          setPeerReady(true);
        }
      },
    );

    return () => {
      live = false;
    };
  }, [walletConnect]);

  // The phones' TON Connect session, restored from storage: it reconnects
  // to its bridge. Extensions have their own session, through detection.
  useEffect(() => {
    if (!tonConnect) {
      return undefined;
    }

    let live = true;
    const unsubscribe = tonConnect.onChange((next) =>
      setTonPeer(phoneOf(next)),
    );

    tonConnect
      .getPeer()
      .then(
        (restored) => {
          if (live) {
            setTonPeer(phoneOf(restored));
          }
        },
        () => undefined,
      )
      .finally(() => {
        if (live) {
          setTonReady(true);
        }
      });

    return () => {
      live = false;
      unsubscribe();
    };
  }, [tonConnect]);

  // The phone can end the session at any time.
  useEffect(
    () =>
      walletConnect?.onSessionEnd(() => {
        setPeer(null);
        writeItem(PAIRED_KEY, null);
      }),
    [walletConnect],
  );

  const chosen =
    choice?.kind === 'detected'
      ? detection.wallets.find((wallet) => wallet.id === choice.id)
      : undefined;

  const resolved = useMemo((): {
    active: ActiveWallet | null;
    unsupportedReason?: UnsupportedReason;
  } => {
    if (choice?.kind === 'ton') {
      if (!tonPeer || !tonConnect) {
        return { active: null };
      }

      const { connector, unsupportedReason } = toTonWalletConnector(
        tonConnect,
        tonPeer,
        connectorOptions?.ton,
      );

      return connector
        ? {
            active: {
              key: `ton-phone:${tonPeer.address}`,
              name: tonPeer.name,
              icon: tonPeer.icon,
              family: 'ton',
              address: tonPeer.address,
              mobile: true,
              connector,
            },
          }
        : { active: null, unsupportedReason };
    }

    if (choice?.kind === 'walletconnect') {
      return peer && walletConnect
        ? {
            active: {
              key: `walletconnect:${peer.address}`,
              name: peer.name,
              icon: peer.icon,
              family: 'evm',
              address: peer.address,
              mobile: true,
              connector: toWalletConnectConnector(walletConnect, peer),
            },
          }
        : { active: null };
    }

    if (!chosen?.address) {
      return { active: null };
    }

    const { connector, unsupportedReason } = toWalletConnector(
      chosen,
      connectorOptions,
    );

    return connector
      ? {
          active: {
            key: `${chosen.id}:${chosen.address}`,
            name: chosen.name,
            icon: chosen.icon,
            family: chosen.family,
            address: chosen.address,
            mobile: false,
            connector,
          },
        }
      : { active: null, unsupportedReason };
  }, [
    choice?.kind,
    peer,
    walletConnect,
    tonPeer,
    tonConnect,
    chosen,
    connectorOptions,
  ]);

  const select = useCallback(
    async (
      wallet: DetectedWallet,
      { signal }: { signal?: AbortSignal } = {},
    ) => {
      if (!wallet.address) {
        await connectDetectedWallet(wallet, { signal });
        await refresh();
      }

      if (!signal?.aborted) {
        setChoice({ kind: 'detected', id: wallet.id });
      }
    },
    [refresh, setChoice],
  );

  const selectPhone = useCallback(
    (paired: WalletConnectPeer) => {
      writeItem(PAIRED_KEY, '1');
      setPeer(paired);
      setChoice({ kind: 'walletconnect' });
    },
    [setChoice],
  );

  const selectTonPhone = useCallback(
    (paired: TonPeer) => {
      setTonPeer(paired);
      setChoice({ kind: 'ton' });
    },
    [setChoice],
  );

  const disconnect = useCallback(async () => {
    if (choice?.kind === 'ton') {
      await tonConnect?.disconnect().catch(() => undefined);
      setTonPeer(null);
    } else if (choice?.kind === 'walletconnect') {
      await walletConnect?.disconnect().catch(() => undefined);
      writeItem(PAIRED_KEY, null);
      setPeer(null);
    } else if (chosen) {
      // An EVM wallet's permission is the page's too: revoking it would also
      // disconnect the dApp. Only stop using it here.
      if (chosen.family === 'evm') {
        forgetWalletConnection(chosen.id);
      } else {
        await disconnectDetectedWallet(chosen);
      }

      await refresh();
    }

    setChoice(null);
  }, [choice?.kind, chosen, walletConnect, tonConnect, refresh, setChoice]);

  return {
    ready: detection.ready && peerReady && tonReady,
    wallets: detection.wallets,
    peer,
    tonPeer,
    ...resolved,
    select,
    selectPhone,
    selectTonPhone,
    disconnect,
  };
};
