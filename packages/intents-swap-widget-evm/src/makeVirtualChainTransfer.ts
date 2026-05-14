import {
  type Chain,
  encodeFunctionData,
  stringToHex,
  type WalletClient,
} from 'viem';
import type {
  MakeTransferArgs,
  TransferResult,
} from '@aurora-is-near/intents-swap-widget';

import { isEvmAddress } from './utils';

// NEAR virtual chains (e.g. Aurora) expose `withdrawToNear()` on their ERC-20
// wrappers to invoke the exitToNear precompile. The bytes payload encodes
// `intents.near:<json msg>` where the JSON has the Intents receiver_id, so
// the asset lands inside NEAR Intents after the bridge call.
const VIRTUAL_CHAIN_ERC20_WITHDRAW_ABI = [
  {
    type: 'function',
    name: 'withdrawToNear',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'bytes' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

type Context = {
  walletClient: WalletClient;
  from: `0x${string}`;
  chain: Chain | null;
};

export const makeVirtualChainTransfer = async (
  args: MakeTransferArgs,
  { walletClient, from, chain }: Context,
): Promise<Pick<TransferResult, 'hash'>> => {
  if (args.isNativeEvmTokenTransfer) {
    throw new Error(
      'Native ETH withdrawals from virtual chains are not supported.',
    );
  }

  if (!args.tokenAddress || !isEvmAddress(args.tokenAddress)) {
    throw new Error(
      `Invalid virtual chain token address: ${args.tokenAddress}`,
    );
  }

  const payload = stringToHex(
    `intents.near:${JSON.stringify({ receiver_id: args.address })}`,
  );

  const data = encodeFunctionData({
    abi: VIRTUAL_CHAIN_ERC20_WITHDRAW_ABI,
    functionName: 'withdrawToNear',
    args: [payload, BigInt(args.amount)],
  });

  const hash = await walletClient.sendTransaction({
    account: from,
    to: args.tokenAddress as `0x${string}`,
    data,
    gas: 100000n,
    gasPrice: 0n,
    chain,
  });

  return { hash };
};
