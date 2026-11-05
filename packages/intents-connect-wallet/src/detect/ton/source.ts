import type { DetectedTonWallet, WalletSource } from '@/detect/types';
import {
  type TonWalletConnectorOptions,
  toTonWalletConnector,
} from '@/ton/toWalletConnector';
import type { TonConnectClient, TonExtension, TonPeer } from '@/ton/types';

/**
 * TON wallet extensions installed in this browser, for
 * `createWalletDetector({ sources })`, over a TON Connect client. The
 * session's wallet, when it's one of them, carries its account.
 *
 * Detection never prompts: the extensions are listed, and the session is
 * restored from storage. A phone paired over the same client isn't listed;
 * read it from the client (`currentPeer`).
 */
export const tonWallets = (client: TonConnectClient): WalletSource => ({
  id: 'ton',
  create: (onChange) => {
    let stopped = false;
    let extensions: readonly TonExtension[] = [];
    let unsubscribe: (() => void) | undefined;
    const wallets = new Map<string, DetectedTonWallet>();

    const walletFor = (
      extension: TonExtension,
      peer: TonPeer | null,
    ): DetectedTonWallet => {
      const id = `ton:${extension.appName}`;
      const address = peer?.address ?? null;
      const known = wallets.get(id);

      // The detector compares plug-in wallets by identity: reuse it.
      if (known && known.address === address) {
        return known;
      }

      const wallet: DetectedTonWallet = {
        id,
        family: 'ton',
        name: extension.name,
        icon: extension.icon,
        address,
        connect: async () => {
          await client.connectExtension(extension.jsBridgeKey);
        },
        disconnect: async () => {
          if (client.currentPeer()?.jsBridgeKey === extension.jsBridgeKey) {
            await client.disconnect();
          }
        },
        toConnector: (options) =>
          toTonWalletConnector(
            client,
            peer,
            options as TonWalletConnectorOptions | undefined,
          ),
      };

      wallets.set(id, wallet);

      return wallet;
    };

    return {
      start: () => {
        unsubscribe = client.onChange(() => onChange());

        // The wallets list is fetched and the session restored once.
        void Promise.all([
          client.listExtensions().catch(() => []),
          client.getPeer().catch(() => null),
        ]).then(([listed]) => {
          if (!stopped) {
            extensions = listed;
            onChange();
          }
        });
      },
      read: async () => {
        const peer = client.currentPeer();

        return extensions.map((extension) =>
          walletFor(
            extension,
            peer?.jsBridgeKey === extension.jsBridgeKey ? peer : null,
          ),
        );
      },
      stop: () => {
        stopped = true;
        unsubscribe?.();
      },
    };
  },
});
