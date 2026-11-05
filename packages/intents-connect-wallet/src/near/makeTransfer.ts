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
import { getMinStorageBalance, getStorageBalance } from '@/near/storage';

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

/** 1Click takes NEAR as wNEAR: native NEAR is wrapped on the way. */
const WNEAR_CONTRACT = 'wrap.near';

const storageDeposit = (
  args: Record<string, unknown>,
  deposit: bigint,
): NearAction => ({
  type: 'FunctionCall',
  params: {
    methodName: 'storage_deposit',
    args,
    gas: FT_DEPOSIT_GAS,
    deposit: deposit.toString(),
  },
});

const fungibleTransfer = (
  receiver: string,
  amount: string,
  msg: string | undefined,
): NearAction => ({
  type: 'FunctionCall',
  params: {
    methodName: msg === undefined ? 'ft_transfer' : 'ft_transfer_call',
    args: {
      receiver_id: receiver,
      amount,
      ...(msg === undefined ? {} : { msg }),
    },
    gas: FT_TRANSFER_GAS,
    // 1 yocto is required by NEP-141.
    deposit: '1',
  },
});

/**
 * Sends the origin-chain deposit for a NEAR origin.
 *
 * Adapted from the widget's `useMakeNEARFtTransferCall`. Three deliberate
 * differences, because that hook served a different flow:
 *
 * 1. **Native NEAR is wrapped in full.** 1Click has no native NEAR asset:
 *    the quote is in wNEAR, so native NEAR is wrapped and sent as wNEAR in
 *    one transaction to `wrap.near`. Unlike the hook, the payer's wNEAR
 *    registration is paid on top (`storage_deposit`, refunded when already
 *    registered) rather than out of the amount, so exactly the quoted
 *    amount arrives.
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

  const contract = args.tokenAddress ?? WNEAR_CONTRACT;

  // NEP-141: register the recipient first if it has no storage balance, else the
  // transfer fails on-chain.
  const [minStorageBalance, recipientStorageBalance] = await Promise.all([
    getMinStorageBalance(contract, rpcUrls),
    getStorageBalance(contract, args.address, rpcUrls),
  ]);

  const storageDelta = minStorageBalance - recipientStorageBalance;
  const actions: NearAction[] = [];

  if (!args.tokenAddress) {
    // Registers the payer with wrap.near; refunded in full when it already
    // is. Without it, near_deposit would take the registration out of the
    // amount and less than quoted would arrive.
    actions.push(
      storageDeposit({ registration_only: true }, minStorageBalance),
    );
  }

  if (storageDelta > 0n) {
    actions.push(storageDeposit({ account_id: args.address }, storageDelta));
  }

  if (!args.tokenAddress) {
    actions.push({
      type: 'FunctionCall',
      params: {
        methodName: 'near_deposit',
        args: {},
        gas: FT_DEPOSIT_GAS,
        deposit: amount,
      },
    });
  }

  actions.push(fungibleTransfer(args.address, amount, msg));

  const outcomes = await wallet.signAndSendTransactions({
    transactions: [
      {
        ...(accountId ? { signerId: accountId } : {}),
        receiverId: contract,
        actions,
      },
    ],
  });

  return firstHash(outcomes);
};
