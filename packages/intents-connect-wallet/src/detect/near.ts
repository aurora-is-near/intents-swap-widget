import type {
  DetectedNearWallet,
  InjectedNearWallet,
  NearInjectedAccount,
} from '@/detect/types';
import { getRememberedConnection } from '@/detect/remembered';
import { callWallet, withTimeout } from '@/detect/withTimeout';

export const NEAR_NETWORK = 'mainnet';

const announce = () => window.dispatchEvent(new Event('near-selector-ready'));

/**
 * NEAR browser-extension wallets via near-connect's injection protocol: the
 * page announces `near-selector-ready`, each wallet answers with
 * `near-wallet-injected` carrying its API.
 *
 * Accounts are read with `getAccounts` only from a wallet the user connected
 * on this site (`connectDetectedWallet`), as near-connect itself only reads
 * the wallet the user picked: some wallets answer `getAccounts` with a
 * sign-in prompt. Every other wallet is listed with no account.
 *
 * Only injected extension wallets are visible this way. Sandboxed (iframe)
 * and in-app-browser wallets need near-connect itself — use `./connect/near`.
 */
export const createNearSource = (onChange: () => void, timeout: number) => {
  const wallets = new Map<string, InjectedNearWallet>();

  const onInjected = (event: Event) => {
    const wallet = (event as CustomEvent<InjectedNearWallet>).detail;

    // Only a NEW wallet is a change: each announce makes every wallet inject
    // again, and treating that as a change would loop announce → refresh.
    if (wallet?.manifest?.id && !wallets.has(wallet.manifest.id)) {
      wallets.set(wallet.manifest.id, wallet);
      onChange();
    }
  };

  const readAccount = async (
    wallet: InjectedNearWallet,
  ): Promise<{ accountId: string; publicKey?: string } | undefined> => {
    const accounts: unknown = await withTimeout(
      callWallet(() => wallet.getAccounts({ network: NEAR_NETWORK })),
      timeout,
    ).catch(() => undefined);

    const [account] = Array.isArray(accounts) ? (accounts as unknown[]) : [];
    const { accountId, publicKey } = (account ?? {}) as Partial<
      Record<keyof NearInjectedAccount, unknown>
    >;

    return typeof accountId === 'string' && accountId
      ? {
          accountId,
          publicKey:
            typeof publicKey === 'string' && publicKey ? publicKey : undefined,
        }
      : undefined;
  };

  const read = async (): Promise<DetectedNearWallet[]> => {
    // Re-announced on every pass: a wallet that loaded after `start()`
    // answers this one. Known wallets re-injecting are not a change.
    announce();

    return Promise.all(
      [...wallets.values()].map(async (wallet) => {
        const id = `near:${wallet.manifest.id}`;
        const account =
          getRememberedConnection(id) === 'connected'
            ? await readAccount(wallet)
            : undefined;

        return {
          id,
          family: 'near' as const,
          name: wallet.manifest.name,
          icon: wallet.manifest.icon,
          address: account?.accountId ?? null,
          publicKey: account?.publicKey,
          wallet,
        };
      }),
    );
  };

  return {
    start: () => {
      window.addEventListener('near-wallet-injected', onInjected);
      announce();
    },
    read,
    stop: () => {
      window.removeEventListener('near-wallet-injected', onInjected);
    },
  };
};
