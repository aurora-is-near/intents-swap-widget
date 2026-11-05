import type { ModuleInterface } from '@creit.tech/stellar-wallets-kit/types';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { xBullModule as XBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';

import {
  getRememberedAddress,
  getRememberedConnection,
  rememberWalletAddress,
} from '@/detect/remembered';
import { moduleProvider } from '@/detect/stellar/provider';
import type { DetectedStellarWallet, WalletSource } from '@/detect/types';
import { callWallet, withTimeout } from '@/detect/withTimeout';
import {
  type StellarWalletConnectorOptions,
  toStellarWalletConnector,
} from '@/stellar/toWalletConnector';

/** The kit module behind a wallet: what the source needs of it. */
export type StellarModule = Pick<
  ModuleInterface,
  | 'productId'
  | 'productName'
  | 'productIcon'
  | 'isAvailable'
  | 'getAddress'
  | 'signMessage'
  | 'signTransaction'
  | 'disconnect'
>;

/**
 * xBull's module always reports itself available: without the extension, it
 * opens xBull's web wallet in a popup for every request. A payment asks for a
 * signature and a transfer seconds after the click, when the browser blocks
 * popups, so only the extension (`window.xBullSDK`) is listed.
 */
const xBullExtension = (): StellarModule =>
  Object.assign(new XBullModule(), {
    isAvailable: async () =>
      typeof window !== 'undefined' &&
      Boolean((window as { xBullSDK?: unknown }).xBullSDK),
  });

/**
 * The wallets that can sign a SEP-53 message. Albedo and Rabet are left
 * out: their modules refuse `signMessage`, so they could never pay.
 */
const defaultModules = (): StellarModule[] => [
  new FreighterModule(),
  xBullExtension(),
  new LobstrModule(),
  new HanaModule(),
];

/** Only Freighter can share its address without a prompt. */
const SILENT = new Set(['freighter']);

/**
 * Stellar browser wallets for `createWalletDetector({ sources })`, through
 * stellar-wallets-kit's modules. Needs `@creit.tech/stellar-wallets-kit` and
 * `@stellar/stellar-sdk`.
 *
 * Detection never prompts. Freighter shares its address silently once the
 * user allowed this site. The others are restored from the address
 * remembered when the user connected them here.
 */
export const stellarWallets = ({
  modules = defaultModules,
}: {
  /** Overrides the wallets listed; mostly for tests. */
  modules?: () => readonly StellarModule[];
} = {}): WalletSource => ({
  id: 'stellar',
  create: (onChange, readTimeoutMs) => {
    let stopped = false;
    // Absent wallets answer `isAvailable` slowly (Freighter and LOBSTR wait
    // ~2 s): asked once, at start, and remembered.
    let available: readonly StellarModule[] | undefined;
    const wallets = new Map<string, DetectedStellarWallet>();

    const addressOf = async (module: StellarModule, id: string) => {
      if (getRememberedConnection(id) === 'disconnected') {
        return null;
      }

      if (SILENT.has(module.productId)) {
        try {
          const { address } = await withTimeout(
            callWallet(() => module.getAddress({ skipRequestAccess: true })),
            readTimeoutMs,
          );

          return address || null;
        } catch {
          return null;
        }
      }

      return getRememberedConnection(id) === 'connected'
        ? (getRememberedAddress(id) ?? null)
        : null;
    };

    const walletFor = (
      module: StellarModule,
      address: string | null,
    ): DetectedStellarWallet => {
      const id = `stellar:${module.productId}`;
      const known = wallets.get(id);

      // The detector compares plug-in wallets by identity: reuse it.
      if (known && known.address === address) {
        return known;
      }

      const wallet: DetectedStellarWallet = {
        id,
        family: 'stellar',
        name: module.productName,
        icon: module.productIcon,
        address,
        connect: async () => {
          const result = await module.getAddress();

          rememberWalletAddress(id, result.address);
          onChange();
        },
        disconnect: async () => {
          await module.disconnect?.();
        },
        toConnector: (options) =>
          toStellarWalletConnector(
            {
              id,
              name: module.productName,
              address,
              provider: moduleProvider(module, address ?? ''),
            },
            options as StellarWalletConnectorOptions | undefined,
          ),
      };

      wallets.set(id, wallet);

      return wallet;
    };

    return {
      start: () => {
        const candidates = modules();

        void Promise.all(
          candidates.map((module) =>
            withTimeout(
              callWallet(() => module.isAvailable()),
              Math.max(readTimeoutMs, 2500),
            ).catch(() => false),
          ),
        ).then((answers) => {
          if (!stopped) {
            available = candidates.filter((_, index) => answers[index]);
            onChange();
          }
        });
      },
      read: async () =>
        Promise.all(
          (available ?? []).map(async (module) =>
            walletFor(
              module,
              await addressOf(module, `stellar:${module.productId}`),
            ),
          ),
        ),
      stop: () => {
        stopped = true;
      },
    };
  },
});
