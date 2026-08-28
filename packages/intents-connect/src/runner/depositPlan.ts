import { EVM_CHAIN_IDS, getChainFamily, parseOriginAsset } from '@/chains';
import type { Execution, SwapType } from '@/types/execution';
import type { OriginToken, ResumeDepositOptions } from '@/runner/types';

/**
 * The subset of an `ExecutionPlan` the deposit leg actually consumes. `run()`
 * retains its full plan (a structural superset), while `resume()` can rebuild
 * one of these from the execution alone — which is what lets a reloaded page
 * still drive the wallet transfer instead of only showing the address.
 */
export type DepositPlan = {
  originChain: string;
  originToken: OriginToken;
  originChainId?: number | null;
  depositViaWallet: boolean;
  quote: { swapType: SwapType; deadline?: string };
};

/**
 * Rebuilds the deposit leg from the execution alone, for a resume with no
 * retained plan. `quote.originAsset` decodes to the chain and token address,
 * the amounts already live on the execution, and for EVM the chain id comes
 * from the built-in registry (EVM transfers move `amountAtomic` and never
 * consult `decimals`). Every other family formats with the token's decimals,
 * so those require `options.originToken` — `undefined` here means "cannot
 * rebuild safely", and the caller surfaces the address instead.
 *
 * `quote.swapType` is required for the same reason: it selects WHICH amount
 * the transfer moves, so an execution that does not echo it cannot be driven.
 */
export const buildResumeDepositPlan = (
  execution: Execution,
  depositOptions?: ResumeDepositOptions,
): DepositPlan | undefined => {
  if (depositOptions?.depositViaWallet === false) {
    return undefined;
  }

  const { originAsset } = execution.quote;
  const origin = originAsset ? parseOriginAsset(originAsset) : undefined;

  if (!origin) {
    return undefined;
  }

  const family = getChainFamily(origin.chain);

  if (!family) {
    return undefined;
  }

  const decimals = depositOptions?.originToken?.decimals;

  if (family !== 'evm' && decimals === undefined) {
    return undefined;
  }

  const originChainId =
    depositOptions?.originChainId ??
    (family === 'evm' ? (EVM_CHAIN_IDS[origin.chain] ?? null) : null);

  if (family === 'evm' && originChainId === null) {
    return undefined;
  }

  const { swapType } = execution.quote;

  // Never defaulted. The two swap types deposit DIFFERENT fields —
  // `quote.amount` for EXACT_INPUT, `quote.amountIn` for EXACT_OUTPUT, which
  // are denominated in different tokens — so guessing here would move the
  // wrong amount on-chain. Absent means "cannot rebuild safely", exactly like
  // the missing decimals and chain id above.
  if (!swapType) {
    return undefined;
  }

  return {
    originChain: origin.chain,
    originToken: {
      contractAddress:
        depositOptions?.originToken?.contractAddress ?? origin.tokenAddress,
      decimals: decimals ?? 0,
    },
    originChainId,
    depositViaWallet: true,
    quote: {
      swapType,
      deadline: execution.quote.deadline,
    },
  };
};
