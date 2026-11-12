import { getRememberedConnection } from '@/detect/remembered';
import type { DetectedTronWallet, WalletSource } from '@/detect/types';
import { callTronWallet } from '@/tron/errors';
import { toTronWalletConnector } from '@/tron/toWalletConnector';
import type { TronInjectedProvider } from '@/tron/types';

type Announced = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: TronInjectedProvider;
};

type Candidate = {
  id: string;
  name: string;
  icon?: string;
  provider: TronInjectedProvider;
};

/** After a connect, how long the wallet gets to set its `tronWeb`. */
const TRONWEB_WAIT_MS = 2_000;
const TRONWEB_POLL_MS = 100;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * The account a wallet already shares with this site, read without a
 * prompt: its `tronWeb` exists, with a default address, only once the user
 * connected the site and while the wallet is unlocked.
 */
const sharedAddress = (provider: TronInjectedProvider): string | null => {
  try {
    const address = provider.tronWeb
      ? provider.tronWeb.defaultAddress?.base58
      : undefined;

    return typeof address === 'string' && address ? address : null;
  } catch {
    return null;
  }
};

/**
 * TRON browser wallets for `createWalletDetector({ sources })`: the ones
 * announced over TIP-6963 (TronLink), or `window.tron` when none is.
 * No dependencies.
 *
 * Detection never prompts: a wallet's account is read from its own
 * `tronWeb`, which exists once the user connected this site. Each wallet
 * keeps its own `tronWeb`; the global `window.tronWeb`, which wallets
 * overwrite, is never used.
 */
export const tronWallets = (): WalletSource => ({
  id: 'tron',
  create: (onChange) => {
    const announced = new Map<string, Announced>();
    const subscribed = new Map<TronInjectedProvider, () => void>();
    const wallets = new Map<string, DetectedTronWallet>();

    const onAnnounce = (event: Event) => {
      const { detail } = event as CustomEvent<Announced>;

      if (detail?.info?.uuid && detail.provider) {
        const isNew = !announced.has(detail.info.uuid);

        announced.set(detail.info.uuid, detail);

        if (isNew) {
          onChange();
        }
      }
    };

    // Locking the wallet, switching accounts and disconnecting the site all
    // arrive as `accountsChanged`.
    const subscribe = (provider: TronInjectedProvider) => {
      if (subscribed.has(provider) || !provider.on) {
        return;
      }

      const listener = () => onChange();

      subscribed.set(provider, () => {
        try {
          provider.removeListener?.('accountsChanged', listener);
        } catch {
          // Nothing left to clean up.
        }
      });

      try {
        provider.on('accountsChanged', listener);
      } catch {
        // Without events the wallet is still read on every refresh.
      }
    };

    const candidates = (): Candidate[] => {
      const list: Candidate[] = [...announced.values()].map(
        ({ info, provider }) => ({
          // rdns survives reloads; the uuid is per page session.
          id: `tron:${info.rdns ?? info.uuid}`,
          name: info.name,
          icon: info.icon,
          provider,
        }),
      );

      // A wallet that doesn't announce itself. With any that does, the
      // global is one of them.
      const injected = (window as { tron?: TronInjectedProvider }).tron;

      if (injected && list.length === 0) {
        list.push({
          id: 'tron:injected',
          name: 'TRON wallet',
          provider: injected,
        });
      }

      return list;
    };

    const walletFor = (
      { id, name, icon, provider }: Candidate,
      address: string | null,
    ): DetectedTronWallet => {
      const known = wallets.get(id);

      // The detector compares plug-in wallets by identity: reuse it.
      if (known && known.address === address) {
        return known;
      }

      const wallet: DetectedTronWallet = {
        id,
        family: 'tron',
        name,
        icon,
        address,
        connect: async () => {
          const { request } = provider;

          if (!request) {
            throw new Error(`${name} can't be connected from this page`);
          }

          await callTronWallet(() =>
            request.call(provider, { method: 'eth_requestAccounts' }),
          );

          // The wallet sets its tronWeb just after the connection.
          for (
            let waited = 0;
            waited < TRONWEB_WAIT_MS && !sharedAddress(provider);
            waited += TRONWEB_POLL_MS
          ) {
            // eslint-disable-next-line no-await-in-loop
            await delay(TRONWEB_POLL_MS);
          }

          onChange();
        },
        // TronLink has no revoke: the site is only forgotten here.
        disconnect: async () => undefined,
        toConnector: () =>
          toTronWalletConnector({ id, name, address, provider }),
      };

      wallets.set(id, wallet);

      return wallet;
    };

    return {
      start: () => {
        window.addEventListener('TIP6963:announceProvider', onAnnounce);
        window.dispatchEvent(new Event('TIP6963:requestProvider'));
      },
      read: async () =>
        candidates().map((candidate) => {
          subscribe(candidate.provider);

          return walletFor(
            candidate,
            getRememberedConnection(candidate.id) === 'disconnected'
              ? null
              : sharedAddress(candidate.provider),
          );
        }),
      stop: () => {
        window.removeEventListener('TIP6963:announceProvider', onAnnounce);
        subscribed.forEach((unsubscribe) => unsubscribe());
        subscribed.clear();
      },
    };
  },
});
