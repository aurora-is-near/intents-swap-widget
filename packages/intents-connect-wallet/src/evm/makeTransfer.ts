import {
  type Address,
  type Chain,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  type WalletClient,
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

/** EIP-1193 `userRejectedRequest`: the user declined a wallet prompt. */
const USER_REJECTED = 4001;

/**
 * EIP-1193 `unauthorized`: the account or method is not authorized for this
 * site. MetaMask scopes permissions per account AND per chain (CAIP-25), so a
 * send right after a switch to a chain the site was never granted lands here
 * — without a prompt.
 */
const UNAUTHORIZED = 4100;

/** How long a switched wallet gets to report the new chain. */
const CHAIN_SETTLE_ATTEMPTS = 5;
const CHAIN_SETTLE_DELAY_MS = 200;

/**
 * Every EIP-1193 `code` along an error's `cause` chain, outermost first.
 * Providers reject with plain `{ code }` objects, and viem wraps those (e.g.
 * `TransactionExecutionError` ← `UnauthorizedProviderError`), so the code may
 * sit several levels down.
 */
const errorCodes = (error: unknown): unknown[] => {
  const codes: unknown[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);

    if ('code' in current && current.code !== undefined) {
      codes.push(current.code);
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return codes;
};

const hasErrorCode = (error: unknown, code: number): boolean =>
  errorCodes(error).includes(code);

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

const readChainId = async (provider: Eip1193Provider): Promise<number> =>
  parseInt((await provider.request({ method: 'eth_chainId' })) as string, 16);

const switchNetworkError = (targetChainId: number) =>
  new Error(
    `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
  );

const switchEthereumChain = async (
  targetChainId: number,
  provider: Eip1193Provider,
): Promise<void> => {
  const currentChainId = await readChainId(provider);

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
    if (hasErrorCode(error, 4902)) {
      await addEthereumChain(targetChainId, provider);

      // Adding usually switches as well, but that is wallet-specific — the
      // explicit switch below is a no-op where it already happened.
      await requestSwitch();

      return;
    }

    throw switchNetworkError(targetChainId);
  }
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Re-reads `eth_chainId` after a switch until the wallet reports the target
 * chain. A switch the wallet has accepted but not yet applied would otherwise
 * send on the old chain's permissions (MetaMask answers with a silent 4100).
 */
const assertChainSettled = async (
  targetChainId: number,
  provider: Eip1193Provider,
  attemptsLeft = CHAIN_SETTLE_ATTEMPTS,
): Promise<void> => {
  if ((await readChainId(provider)) === targetChainId) {
    return;
  }

  if (attemptsLeft <= 1) {
    throw switchNetworkError(targetChainId);
  }

  await wait(CHAIN_SETTLE_DELAY_MS);

  return assertChainSettled(targetChainId, provider, attemptsLeft - 1);
};

/**
 * The account to send from: the one the wallet already exposes on this chain,
 * or — when it exposes none here (per-chain permissions) — the one it grants
 * through `eth_requestAccounts`.
 */
const readAccount = async (walletClient: WalletClient): Promise<Address> => {
  let [from] = await walletClient.getAddresses();

  if (!from) {
    [from] = await walletClient.requestAddresses();
  }

  if (!from) {
    throw new Error('No EVM account found in the injected wallet.');
  }

  return from;
};

/**
 * Asks the wallet to authorize this site's accounts again, then re-reads the
 * account. A rejection (4001) propagates untouched so the runner still reads
 * it as a cancel; a wallet without `wallet_requestPermissions` falls back to
 * the `eth_requestAccounts` inside `readAccount`.
 */
const reauthorize = async (walletClient: WalletClient): Promise<Address> => {
  try {
    await walletClient.requestPermissions({ eth_accounts: {} });
  } catch (error: unknown) {
    if (hasErrorCode(error, USER_REJECTED)) {
      throw error;
    }
  }

  return readAccount(walletClient);
};

/** A 4100 that is not also a user rejection — the one case worth a retry. */
const isUnauthorized = (error: unknown): boolean =>
  hasErrorCode(error, UNAUTHORIZED) && !hasErrorCode(error, USER_REJECTED);

type SendContext = {
  walletClient: WalletClient;
  provider: Eip1193Provider;
  from: Address;
  evmChainId: number;
};

/**
 * Runs a send, and recovers ONCE from a 4100 (site not authorized for the
 * account on this chain) by requesting permissions and retrying with the
 * re-read account. A second 4100 becomes a readable error naming the chain;
 * anything else — a 4001 above all — is rethrown unchanged.
 *
 * The chain is confirmed again before the retry: the user may switch networks
 * while the permission prompt is open, and for a chain viem does not know
 * (`chain: null`) viem would not catch it, so the retry would be signed for
 * whatever network the wallet is on.
 */
const sendAuthorized = async <T>(
  { walletClient, provider, from, evmChainId }: SendContext,
  send: (account: Address) => Promise<T>,
): Promise<T> => {
  try {
    return await send(from);
  } catch (error: unknown) {
    if (!isUnauthorized(error)) {
      throw error;
    }
  }

  const account = await reauthorize(walletClient);

  await assertChainSettled(evmChainId, provider);

  try {
    return await send(account);
  } catch (error: unknown) {
    if (!isUnauthorized(error)) {
      throw error;
    }

    const chainName = findViemChain(evmChainId)?.name ?? `chain ${evmChainId}`;

    throw new Error(
      `Your wallet hasn't authorized this site on ${chainName} — reconnect and try again`,
      { cause: error },
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
 *
 * After the switch it re-reads the chain and the account, and a send the
 * wallet refuses with 4100 (site not authorized on this chain) is retried once
 * after `wallet_requestPermissions`. A `retryDeposit()` reaches this same path
 * through the connector, so it recovers the same way.
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

  const { evmChainId } = args;

  await switchEthereumChain(evmChainId, resolved);
  await assertChainSettled(evmChainId, resolved);

  const walletClient = createWalletClient({
    transport: custom(resolved as Parameters<typeof custom>[0]),
  });

  const from = await readAccount(walletClient);
  const chain = findViemChain(evmChainId) ?? null;
  const sendContext: SendContext = {
    walletClient,
    provider: resolved,
    from,
    evmChainId,
  };

  if (isVirtualChainSource) {
    return sendAuthorized(sendContext, (account) =>
      makeVirtualChainTransfer(args, { walletClient, from: account, chain }),
    );
  }

  const amount = resolveTransferAmount(args);

  if (args.isNativeEvmTokenTransfer) {
    const hash = await sendAuthorized(sendContext, (account) =>
      walletClient.sendTransaction({
        account,
        to: args.address as `0x${string}`,
        value: amount,
        chain,
      }),
    );

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

  const tokenAddress = args.tokenAddress as `0x${string}`;

  const hash = await sendAuthorized(sendContext, (account) =>
    walletClient.sendTransaction({ account, to: tokenAddress, data, chain }),
  );

  return { hash };
};
