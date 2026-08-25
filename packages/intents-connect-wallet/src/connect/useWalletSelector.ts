import { useCallback, useMemo, useState } from 'react';
import type { Providers } from '@aurora-is-near/intents-connect';

import type { ChainWalletConnector } from '@/connect/types';

export type WalletSelectorState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Connects one connector, disconnecting the others first. */
  select: (id: string) => Promise<void>;
  /** Disconnects whichever connector is currently connected. */
  disconnect: () => Promise<void>;
  address: string | undefined;
  /** Shaped like the widget's `connectedWallets` for drop-in use. */
  connectedWallets: { default: string | undefined };
  providers: Providers;
  connected: ChainWalletConnector | undefined;
};

/**
 * Coordinates mutually exclusive wallet connections.
 *
 * Connections are exclusive because an execution is bound to exactly one origin
 * wallet: `details.signingStandard` follows from it, and so does the
 * intermediary address. Connecting a second chain without dropping the first
 * would leave two candidate signers and an ambiguous intermediary.
 */
export const useWalletSelector = (
  connectors: readonly ChainWalletConnector[],
): WalletSelectorState => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const connected = useMemo(
    () => connectors.find((c) => c.isConnected),
    [connectors],
  );

  const select = useCallback(
    async (id: string) => {
      setIsOpen(false);

      const target = connectors.find((c) => c.id === id);

      if (!target) {
        throw new Error(`No wallet connector registered for id "${id}"`);
      }

      await Promise.all(
        connectors
          .filter((c) => c.id !== id && c.isConnected)
          .map(async (c) => c.disconnect()),
      );

      await target.connect();
    },
    [connectors],
  );

  const disconnect = useCallback(async () => {
    await Promise.all(
      connectors.filter((c) => c.isConnected).map(async (c) => c.disconnect()),
    );
  }, [connectors]);

  const providers = useMemo<Providers>(
    () =>
      connectors.reduce<Providers>(
        (acc, c) => ({ ...acc, ...(c.getProviders?.() ?? {}) }),
        {},
      ),
    [connectors],
  );

  return {
    isOpen,
    open,
    close,
    select,
    disconnect,
    address: connected?.address,
    connectedWallets: { default: connected?.address },
    providers,
    connected,
  };
};
