import {
  type MakeTransfer,
  type MakeTransferArgs,
  resolveTransferAmount,
  type TransferResult,
} from '@aurora-is-near/intents-connect';

import { FT_DEPOSIT_GAS, FT_TRANSFER_GAS } from '@/near/config';
import type {
  NearAction,
  NearTransactionOutcome,
  NearTransferOptions,
  NearTransferWallet,
} from '@/near/types';
import { getMinStorageBalance, getStorageBalance } from '@/near/viewCall';

const resolveWallet = (
  wallet: NearTransferOptions['wallet'],
): NearTransferWallet => (typeof wallet === 'function' ? wallet() : wallet);

const firstHash = (
  outcomes: NearTransactionOutcome[] | undefined,
): Pick<TransferResult, 'hash'> => {
  const hash = outcomes?.[0]?.transaction?.hash;

  if (!hash) {
    throw new Error('NEAR wallet returned no transaction hash.');
  }

  return { hash };
};

/**
 * Sends the origin-chain deposit for a NEAR origin.
 *
 * Adapted from the widget's `useMakeNEARFtTransferCall`. Three deliberate
 * differences, because that hook served a different flow:
 *
 * 1. **No wNEAR wrapping.** The hook wraps native NEAR into wNEAR when the
 *    widget's target is wNEAR. An Intents Connect deposit just moves the origin
 *    asset to the 1Click deposit address, so that branch does not apply.
 * 2. **`ft_transfer` by default, not `ft_transfer_call`.** The deposit address is
 *    a plain account that does not implement `ft_on_transfer`, so a
 *    `ft_transfer_call` would be refunded. Pass `msg` to opt into
 *    `ft_transfer_call` for contracts that do expect one.
 * 3. **User rejection is not swallowed.** The hook returns `undefined` when the
 *    user declines; the runner needs a rejection so the phase machine can fail
 *    instead of destructuring a missing hash.
 *
 * Retained from the hook: the `storage_deposit` top-up when the recipient is not
 * registered for the token, which is what keeps a first-time transfer from
 * failing on-chain.
 */
export const makeTransfer: MakeTransfer<NearTransferOptions> = async (
  args: MakeTransferArgs,
  options: NearTransferOptions,
): Promise<Pick<TransferResult, 'hash'>> => {
  if (!options?.wallet) {
    throw new Error(
      'NEAR transfer requires pluginOptions.wallet (a transfer-capable NEAR wallet)',
    );
  }

  const { rpcUrls, accountId, msg } = options;
  const wallet = resolveWallet(options.wallet);
  const amount = resolveTransferAmount(args).toString();

  if (!args.address) {
    throw new Error('No recipient address to transfer.');
  }

  // Native NEAR: a plain Transfer of yoctoNEAR.
  if (!args.tokenAddress) {
    const outcomes = await wallet.signAndSendTransactions({
      transactions: [
        {
          ...(accountId ? { signerId: accountId } : {}),
          receiverId: args.address,
          actions: [{ type: 'Transfer', params: { deposit: amount } }],
        },
      ],
    });

    return firstHash(outcomes);
  }

  // NEP-141: register the recipient first if it has no storage balance, else the
  // transfer fails on-chain.
  const actions: NearAction[] = [];

  const [minStorageBalance, recipientStorageBalance] = await Promise.all([
    getMinStorageBalance(args.tokenAddress, rpcUrls),
    getStorageBalance(args.tokenAddress, args.address, rpcUrls),
  ]);

  const storageDelta = minStorageBalance - recipientStorageBalance;

  if (storageDelta > 0n) {
    actions.push({
      type: 'FunctionCall',
      params: {
        methodName: 'storage_deposit',
        args: { account_id: args.address },
        gas: FT_DEPOSIT_GAS,
        deposit: storageDelta.toString(),
      },
    });
  }

  actions.push({
    type: 'FunctionCall',
    params: {
      methodName: msg === undefined ? 'ft_transfer' : 'ft_transfer_call',
      args: {
        receiver_id: args.address,
        amount,
        ...(msg === undefined ? {} : { msg }),
      },
      gas: FT_TRANSFER_GAS,
      // 1 yocto is required by NEP-141.
      deposit: '1',
    },
  });

  const outcomes = await wallet.signAndSendTransactions({
    transactions: [
      {
        ...(accountId ? { signerId: accountId } : {}),
        receiverId: args.tokenAddress,
        actions,
      },
    ],
  });

  return firstHash(outcomes);
};
