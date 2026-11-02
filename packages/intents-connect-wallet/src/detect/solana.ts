import type {
  DetectedSolanaWallet,
  StandardWalletAccount,
  StandardWalletLike,
} from '@/detect/types';
import { callWallet, withTimeout } from '@/detect/withTimeout';

export const SOLANA_MAINNET = 'solana:mainnet';

const REQUIRED_FEATURES = [
  'standard:connect',
  'solana:signMessage',
  'solana:signTransaction',
];

type ConnectFeature = {
  connect: (input?: {
    silent?: boolean;
  }) => Promise<{ accounts: readonly StandardWalletAccount[] }>;
};

type EventsFeature = {
  on: (event: 'change', listener: () => void) => () => void;
};

export const isSolanaWallet = (wallet: StandardWalletLike) =>
  wallet.chains.includes(SOLANA_MAINNET) &&
  REQUIRED_FEATURES.every((feature) => feature in wallet.features);

/** Reconnects without a prompt, when the wallet already trusts the site. */
export const silentConnect = async (
  wallet: StandardWalletLike,
): Promise<readonly StandardWalletAccount[]> => {
  const { accounts } = await (
    wallet.features['standard:connect'] as ConnectFeature
  ).connect({ silent: true });

  return accounts.length ? accounts : wallet.accounts;
};

/**
 * Solana wallets via the Wallet Standard registration protocol, both
 * directions: wallets that load after us register on our event, wallets that
 * loaded before answer `app-ready`. Ported from the extensions' bridge.
 */
export const createSolanaSource = (
  onChange: () => void,
  { timeout, silent }: { timeout: number; silent: boolean },
) => {
  const wallets = new Map<string, StandardWalletLike>();
  const unsubscribers = new Map<string, () => void>();

  const register = (...registered: StandardWalletLike[]) => {
    const added = registered.filter(isSolanaWallet);

    added.forEach((wallet) => {
      wallets.set(wallet.name, wallet);

      const events = wallet.features['standard:events'] as
        | EventsFeature
        | undefined;

      unsubscribers.get(wallet.name)?.();
      unsubscribers.set(
        wallet.name,
        events?.on('change', onChange) ?? (() => undefined),
      );
    });

    if (added.length) {
      onChange();
    }

    return () => {
      added.forEach((wallet) => {
        unsubscribers.get(wallet.name)?.();
        unsubscribers.delete(wallet.name);
        wallets.delete(wallet.name);
      });
      onChange();
    };
  };

  const onRegister = (event: Event) => {
    const callback = (
      event as CustomEvent<(api: { register: typeof register }) => void>
    ).detail;

    if (typeof callback === 'function') {
      callback({ register });
    }
  };

  // Wallets already asked to reconnect silently. Asked once each: a wallet
  // that ignores `silent` would otherwise stack a prompt on every pass.
  const silentlyAsked = new Set<StandardWalletLike>();

  const readAddress = async (
    wallet: StandardWalletLike,
  ): Promise<string | null> => {
    try {
      let { accounts } = wallet;

      if (!accounts.length && silent && !silentlyAsked.has(wallet)) {
        silentlyAsked.add(wallet);
        accounts = await withTimeout(
          callWallet(() => silentConnect(wallet)),
          timeout,
        ).catch(() => wallet.accounts);
      }

      // An account may be scoped to chains; skip one that excludes mainnet.
      const account = accounts.find(
        (candidate) =>
          !candidate.chains?.length ||
          candidate.chains.includes(SOLANA_MAINNET),
      );

      return typeof account?.address === 'string' ? account.address : null;
    } catch {
      // A wallet whose accounts cannot be read is listed, with nothing shared.
      return null;
    }
  };

  const read = async (): Promise<DetectedSolanaWallet[]> =>
    Promise.all(
      [...wallets.values()].map(async (wallet) => ({
        id: `sol:${wallet.name}`,
        family: 'sol' as const,
        name: wallet.name,
        icon: wallet.icon,
        address: await readAddress(wallet),
        wallet,
      })),
    );

  return {
    start: () => {
      window.addEventListener('wallet-standard:register-wallet', onRegister);
      window.dispatchEvent(
        new CustomEvent('wallet-standard:app-ready', { detail: { register } }),
      );
    },
    read,
    stop: () => {
      window.removeEventListener('wallet-standard:register-wallet', onRegister);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
    },
  };
};
