import {
  type Chain,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
} from 'viem';
import * as viemChains from 'viem/chains';
import type { Eip1193Provider } from 'ethers';
import type {
  MakeTransferArgs,
  TransferResult,
} from '@aurora-is-near/intents-swap-widget';

import type { MakeTransferOptions } from './types';

const isEvmAddress = (a: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(a);

const findViemChain = (id: number): Chain | undefined => {
  for (const c of Object.values(viemChains)) {
    if (
      c &&
      typeof c === 'object' &&
      'id' in c &&
      typeof (c as { id: unknown }).id === 'number' &&
      (c as Chain).id === id
    ) {
      return c as Chain;
    }
  }

  return undefined;
};

const defaultTransactionLink = (chainId: number, hash: string): string => {
  const chain = findViemChain(chainId);
  const explorerUrl = chain?.blockExplorers?.default?.url;

  return explorerUrl ? `${explorerUrl}/tx/${hash}` : '';
};

const switchEthereumChain = async (
  targetChainId: number,
  provider: Eip1193Provider,
): Promise<void> => {
  const currentChainIdHex = await provider.request({ method: 'eth_chainId' });
  const currentChainId = parseInt(currentChainIdHex as string, 16);

  if (currentChainId === targetChainId) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: unknown }).code === 4902
    ) {
      throw new Error(`Chain ${targetChainId} is not available.`);
    }

    throw new Error(
      `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
    );
  }
};

export const makeTransfer = async (
  args: MakeTransferArgs,
  {
    provider,
    getTransactionLink = defaultTransactionLink,
  }: MakeTransferOptions,
): Promise<TransferResult> => {
  const resolved =
    typeof provider === 'function' ? await provider() : provider;

  if (!isEvmAddress(args.address)) {
    throw new Error(`Invalid EVM address: ${args.address}`);
  }

  if (!args.evmChainId) {
    throw new Error('EVM chain ID is required for EVM transfers.');
  }

  if (!resolved) {
    throw new Error('No injected Ethereum wallet found.');
  }

  await switchEthereumChain(args.evmChainId, resolved);

  const walletClient = createWalletClient({
    transport: custom(resolved as Parameters<typeof custom>[0]),
  });

  let [from] = await walletClient.getAddresses();

  if (!from) {
    [from] = await walletClient.requestAddresses();
  }

  if (!from) {
    throw new Error('No EVM account found in the injected wallet.');
  }

  const chain = findViemChain(args.evmChainId) ?? null;

  if (args.isNativeEvmTokenTransfer) {
    const hash = await walletClient.sendTransaction({
      account: from,
      to: args.address as `0x${string}`,
      value: BigInt(args.amount),
      chain,
    });

    return {
      hash,
      transactionLink: getTransactionLink(args.evmChainId, hash),
    };
  }

  if (!args.tokenAddress || !isEvmAddress(args.tokenAddress)) {
    throw new Error(`Invalid EVM token address: ${args.tokenAddress}`);
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [args.address as `0x${string}`, BigInt(args.amount)],
  });

  const hash = await walletClient.sendTransaction({
    account: from,
    to: args.tokenAddress as `0x${string}`,
    data,
    chain,
  });

  return {
    hash,
    transactionLink: getTransactionLink(args.evmChainId, hash),
  };
};
