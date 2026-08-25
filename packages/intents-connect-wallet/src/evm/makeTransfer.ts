import {
  type Chain,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
} from 'viem';
import * as viemChains from 'viem/chains';
import {
  type Eip1193Provider,
  type MakeTransfer,
  type MakeTransferArgs,
  resolveTransferAmount,
  type TransferResult,
} from '@aurora-is-near/intents-connect';

import { makeVirtualChainTransfer } from '@/evm/makeVirtualChainTransfer';
import type { EvmTransferOptions } from '@/evm/types';
import { isEvmAddress, isVirtualChain } from '@/evm/utils';

const findViemChain = (id: number): Chain | undefined =>
  (Object.values(viemChains) as unknown[]).find(
    (c): c is Chain =>
      !!c &&
      typeof c === 'object' &&
      'id' in c &&
      typeof (c as { id: unknown }).id === 'number' &&
      (c as Chain).id === id,
  );

/**
 * 4902 = the wallet has never had this chain added. Recoverable: offer the
 * chain via `wallet_addEthereumChain` (the wallet prompts the user to add —
 * and usually to switch to — it) using viem's registry metadata.
 */
const addEthereumChain = async (
  targetChainId: number,
  provider: Eip1193Provider,
): Promise<void> => {
  const chain = findViemChain(targetChainId);

  if (!chain) {
    throw new Error(
      `Chain ${targetChainId} is not available in your wallet and is unknown to the viem registry — add it to the wallet manually`,
    );
  }

  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${targetChainId.toString(16)}`,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: [...chain.rpcUrls.default.http],
        blockExplorerUrls: chain.blockExplorers
          ? [chain.blockExplorers.default.url]
          : undefined,
      },
    ],
  });
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

  const requestSwitch = () =>
    provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });

  try {
    await requestSwitch();
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: unknown }).code
        : undefined;

    if (code === 4902) {
      await addEthereumChain(targetChainId, provider);

      // Adding usually switches as well, but that is wallet-specific — the
      // explicit switch below is a no-op where it already happened.
      await requestSwitch();

      return;
    }

    throw new Error(
      `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
    );
  }
};

/**
 * Sends the origin-chain deposit for an EVM origin.
 *
 * Ported from `@aurora-is-near/intents-swap-widget-evm`, with three deltas:
 * types come from `intents-connect` instead of the widget, the amount is read
 * through `resolveTransferAmount` so both `amountAtomic` (what the runner sets)
 * and the widget's `amount` field work, and a 4902 chain switch is recovered by
 * offering the chain via `wallet_addEthereumChain` rather than giving up.
 */
export const makeTransfer: MakeTransfer<EvmTransferOptions> = async (
  args: MakeTransferArgs,
  options: EvmTransferOptions,
): Promise<Pick<TransferResult, 'hash'>> => {
  const provider = options?.provider;
  const resolved = typeof provider === 'function' ? await provider() : provider;
  const isVirtualChainSource = isVirtualChain(args.chain);

  // When the source is a NEAR virtual chain (e.g. Aurora), the 1Click deposit
  // address is a NEAR account (intents.near sub-account) rather than an EVM
  // address.
  if (!isVirtualChainSource && !isEvmAddress(args.address)) {
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

  if (isVirtualChainSource) {
    return makeVirtualChainTransfer(args, { walletClient, from, chain });
  }

  const amount = resolveTransferAmount(args);

  if (args.isNativeEvmTokenTransfer) {
    const hash = await walletClient.sendTransaction({
      account: from,
      to: args.address as `0x${string}`,
      value: amount,
      chain,
    });

    return { hash };
  }

  if (!args.tokenAddress || !isEvmAddress(args.tokenAddress)) {
    throw new Error(`Invalid EVM token address: ${args.tokenAddress}`);
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [args.address as `0x${string}`, amount],
  });

  const hash = await walletClient.sendTransaction({
    account: from,
    to: args.tokenAddress as `0x${string}`,
    data,
    chain,
  });

  return { hash };
};
