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

/** The wallet the user pays from, remembered across reloads. */
const CHOICE_KEY = 'aurora-intents.wallet';
/**
 * Restoring a WalletConnect session connects to its relay, so it is only
 * tried once a phone was paired here.
 */
const PAIRED_KEY = 'aurora-intents.walletconnect.paired';

type Choice = { kind: 'detected'; id: string } | { kind: 'walletconnect' };

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
  /** The paired phone wallet, chosen or not. */
  peer: WalletConnectPeer | null;
  active: ActiveWallet | null;
  /** Why the chosen wallet can't be used, e.g. NEAR without a public key. */
  unsupportedReason?: UnsupportedReason;
  /** Picks a browser wallet, through its own prompt if it shares no account. */
  select: (wallet: DetectedWallet) => Promise<void>;
  /** Picks the phone wallet: the one just paired, or the restored one. */
  selectPhone: (peer: WalletConnectPeer) => void;
  /** Stops paying from the active wallet. */
  disconnect: () => Promise<void>;
};

/**
 * Which wallet pays: a browser wallet found by detection, or a phone paired
 * over WalletConnect. Nothing prompts until the user picks a wallet that
 * shares no account with the page yet.
 */
export const useWalletSession = ({
  walletConnect,
  connectorOptions,
  walletSources,
}: {
  walletConnect?: WalletConnectClient;
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
  }, [choice?.kind, peer, walletConnect, chosen, connectorOptions]);

  const select = useCallback(
    async (wallet: DetectedWallet) => {
      if (!wallet.address) {
        await connectDetectedWallet(wallet);
        await refresh();
      }

      setChoice({ kind: 'detected', id: wallet.id });
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

  const disconnect = useCallback(async () => {
    if (choice?.kind === 'walletconnect') {
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
  }, [choice?.kind, chosen, walletConnect, refresh, setChoice]);

  return {
    ready: detection.ready && peerReady,
    wallets: detection.wallets,
    peer,
    ...resolved,
    select,
    selectPhone,
    disconnect,
  };
};
