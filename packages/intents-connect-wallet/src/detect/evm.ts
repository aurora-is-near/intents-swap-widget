import type { DetectedEvmWallet, Eip1193Like } from '@/detect/types';
import { withTimeout } from '@/detect/withTimeout';

type AnnouncedProvider = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Like;
};

const EVENTS = ['accountsChanged', 'chainChanged'] as const;

/**
 * EVM wallets via EIP-6963, read silently: `eth_accounts` and `eth_chainId`
 * never prompt. Ported from the Chrome extensions' page bridge.
 *
 * Note: `eth_accounts` can stay non-empty after a user "disconnects" in a
 * site's own UI — only the wallet's site-permission revoke clears it.
 */
export const createEvmSource = (onChange: () => void, timeout: number) => {
  const announced = new Map<string, AnnouncedProvider>();
  const subscribed = new Map<Eip1193Like, () => void>();

  const onAnnounce = (event: Event) => {
    const { detail } = event as CustomEvent<AnnouncedProvider>;

    if (detail?.info?.uuid && detail.provider) {
      const isNew = !announced.has(detail.info.uuid);

      announced.set(detail.info.uuid, detail);

      if (isNew) {
        onChange();
      }
    }
  };

  const subscribe = (provider: Eip1193Like) => {
    if (subscribed.has(provider) || !provider.on) {
      return;
    }

    const listener = () => onChange();

    EVENTS.forEach((event) => provider.on?.(event, listener));
    subscribed.set(provider, () =>
      EVENTS.forEach((event) => provider.removeListener?.(event, listener)),
    );
  };

  const wallets = (): Omit<DetectedEvmWallet, 'address' | 'chainId'>[] => {
    const byId = new Map<
      string,
      Omit<DetectedEvmWallet, 'address' | 'chainId'>
    >();

    announced.forEach(({ info, provider }) => {
      // rdns survives reloads; the 6963 uuid is per page session.
      const id = `evm:${info.rdns ?? info.uuid}`;

      byId.set(id, {
        id,
        family: 'evm',
        name: info.name,
        icon: info.icon,
        rdns: info.rdns,
        provider,
      });
    });

    // Pre-6963 wallets only expose the legacy global. With any 6963 wallet
    // present, the global is one of them behind a proxy — listing it again
    // would show a phantom duplicate.
    const legacy = (window as { ethereum?: Eip1193Like }).ethereum;

    if (legacy && byId.size === 0) {
      byId.set('evm:legacy', {
        id: 'evm:legacy',
        family: 'evm',
        name: 'Browser wallet',
        provider: legacy,
      });
    }

    return [...byId.values()];
  };

  const read = async (): Promise<DetectedEvmWallet[]> =>
    Promise.all(
      wallets().map(async (wallet): Promise<DetectedEvmWallet> => {
        subscribe(wallet.provider);

        try {
          const accounts = await withTimeout(
            wallet.provider.request({ method: 'eth_accounts' }),
            timeout,
          );

          const [address] = Array.isArray(accounts)
            ? (accounts as unknown[]).filter(
                (value): value is string => typeof value === 'string',
              )
            : [];

          if (!address) {
            return { ...wallet, address: null };
          }

          const chainId = await withTimeout(
            wallet.provider.request({ method: 'eth_chainId' }),
            timeout,
          ).catch(() => undefined);

          return {
            ...wallet,
            address,
            chainId:
              typeof chainId === 'string' || typeof chainId === 'number'
                ? Number(chainId)
                : undefined,
          };
        } catch {
          // Locked or unresponsive: listed, with nothing shared.
          return { ...wallet, address: null };
        }
      }),
    );

  return {
    start: () => {
      window.addEventListener('eip6963:announceProvider', onAnnounce);
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    },
    read,
    stop: () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      subscribed.forEach((unsubscribe) => unsubscribe());
      subscribed.clear();
    },
  };
};
