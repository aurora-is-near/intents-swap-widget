import type { WalletConnector } from '@aurora-is-near/intents-connect';

import type { UnsupportedReason } from '@/detect/types';
import { makeTransfer } from '@/tron/makeTransfer';
import { requireTronWeb, tronProvider } from '@/tron/provider';
import type { TronInjectedProvider } from '@/tron/types';

const noop = () => Promise.resolve();

/**
 * A TRON wallet as an Intents Connect `WalletConnector`: `tip191` signing,
 * checked against the account, and deposits through the wallet's own
 * TronWeb (`provider.tronWeb`), never the global `window.tronWeb`, which
 * other wallets overwrite.
 */
export const toTronWalletConnector = (wallet: {
  id: string;
  name: string;
  address: string | null;
  provider: TronInjectedProvider;
}): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  const { address, provider } = wallet;

  if (!address) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  return {
    connector: {
      id: wallet.id,
      name: wallet.name,
      chains: ['tron'],
      signingStandard: 'tip191',
      connect: noop,
      disconnect: noop,
      getAddress: () => address,
      getProviders: () => ({ tron: tronProvider(provider, address) }),
      makeTransfer: (args) =>
        makeTransfer(args, { tronWeb: requireTronWeb(provider), address }),
    },
  };
};
