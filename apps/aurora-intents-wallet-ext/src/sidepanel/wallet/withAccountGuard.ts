import { TransferError } from '@aurora-is-near/intents-swap-widget';
import type {
  EvmProvider,
  SolanaProvider,
} from '@aurora-is-near/intents-swap-widget';

import { SOLANA_METHODS } from '../../shared/bridge';
import { shortAddress } from '../utils';
import { requestPage } from './createPageProvider';
import type { TabResolver } from './createPageProvider';

type Eip1193Provider = Exclude<EvmProvider, () => unknown>;

/**
 * The wallet is on another of its accounts than the one connected here. A
 * widget error, so the transfer screens show its message.
 */
const wrongAccount = (walletName: string, address: string) =>
  new TransferError({
    code: 'DIRECT_TRANSFER_ERROR',
    meta: {
      message: `Switch ${walletName} to ${shortAddress(address)} and try again.`,
    },
  });

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Requests the wallet answers for whichever account it currently exposes. */
const GUARDED_EVM_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
]);

/**
 * The bridge reaches a wallet, not an account: a wallet with several accounts
 * signs with the one it has selected. Before anything that signs, these check
 * it is still `address`, so a transfer can't go out from another account.
 */
export const guardEvmProvider = (
  provider: Eip1193Provider,
  { walletName, address }: { walletName: string; address: string },
): Eip1193Provider => ({
  request: async (args) => {
    if (GUARDED_EVM_METHODS.has(args.method)) {
      const accounts = (await provider.request({ method: 'eth_accounts' })) as
        | string[]
        | undefined;

      if (!accounts?.some((account) => same(account, address))) {
        throw wrongAccount(walletName, address);
      }
    }

    return provider.request(args);
  },
});

export const guardSolanaProvider = <T>(
  provider: SolanaProvider<T>,
  getTabId: TabResolver,
  {
    walletName,
    bridgeId,
    address,
  }: { walletName: string; bridgeId: string; address: string },
): SolanaProvider<T> => {
  const check = async () => {
    const current = await requestPage<string>(
      await getTabId(),
      SOLANA_METHODS.connect,
      { name: bridgeId, silent: true },
    );

    if (!same(current, address)) {
      throw wrongAccount(walletName, address);
    }
  };

  return {
    ...provider,
    signMessage: async (message) => {
      await check();

      return provider.signMessage(message);
    },
    signTransaction: async (transaction) => {
      await check();

      return provider.signTransaction(transaction);
    },
  };
};
