import type { DetectedNearWallet, InjectedNearWallet } from '@/detect/types';
import { withTimeout } from '@/detect/withTimeout';

export const NEAR_NETWORK = 'mainnet';

const announce = () => window.dispatchEvent(new Event('near-selector-ready'));

/**
 * NEAR browser-extension wallets via near-connect's injection protocol: the
 * page announces `near-selector-ready`, each wallet answers with
 * `near-wallet-injected` carrying its API. Accounts are read with
 * `getAccounts`, which does not prompt once the site is trusted.
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

  const read = async (): Promise<DetectedNearWallet[]> =>
    Promise.all(
      [...wallets.values()].map(async (wallet) => {
        const [account] = await withTimeout(
          wallet.getAccounts({ network: NEAR_NETWORK }),
          timeout,
        ).catch(() => []);

        return {
          id: `near:${wallet.manifest.id}`,
          family: 'near' as const,
          name: wallet.manifest.name,
          icon: wallet.manifest.icon,
          address: account?.accountId ?? null,
          publicKey: account?.publicKey,
          wallet,
        };
      }),
    );

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
