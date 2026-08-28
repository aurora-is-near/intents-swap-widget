import {
  EVM_CHAIN_IDS,
  isEvmChain,
  PUBLIC_KEY_REQUIRED_CHAINS,
} from '@/chains';
import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import type { ExecutionType, Intermediary, Step } from '@/types/execution';
import type { WalletConnector } from '@/types/wallet';
import type { CreateExecutionBody } from '@/api/types';
import { DEFAULT_QUOTE_DEADLINE_MS } from '@/runner/constants';
import type { ExecutionPlan } from '@/runner/types';

/**
 * Exhaustive on purpose: `Intermediary` already names more account types
 * (near, stellar, tron, ton), so when `ExecutionType` grows, this switch is a
 * compile error instead of silently handing the new type the EVM account.
 */
const intermediaryAccountFor = (
  type: ExecutionType,
  intermediary: Intermediary,
): string | null => {
  switch (type) {
    case 'evm':
      return intermediary.evm;
    case 'solana':
      return intermediary.solana;
    default: {
      const unhandled: never = type;

      throw new Error(
        `no intermediary account mapping for execution type ${String(unhandled)}`,
      );
    }
  }
};

/**
 * The intermediary account the steps execute against is per execution TYPE:
 * solana steps need the solana account (ATA derivation requires a concrete
 * base58 address), and it may legitimately be null when the feature is off.
 */
export const pickIntermediaryAddress = <TParams>(
  plan: ExecutionPlan<TParams>,
  intermediary: Intermediary,
): string => {
  const address = intermediaryAccountFor(plan.recipe.type, intermediary);

  if (!address) {
    return failGuard(
      'NO_INTERMEDIARY',
      `the service returned no ${plan.recipe.type} intermediary account for this wallet`,
    );
  }

  return address;
};

/**
 * Fills in an EVM origin's chain id from the built-in registry, exactly as
 * `buildResumeDepositPlan` already does for a resume.
 *
 * `originChainId` reads as guard-only, but it is also forwarded to the deposit
 * transfer as `evmChainId`, and the EVM path REFUSES to run without one — so an
 * omitted id used to strand the execution after the signature, with
 * `retryDeposit()` replaying the identical failure forever. Defaulting it here,
 * before planning, also arms the network-mismatch guard, which turns a
 * wrong-network wallet into a failure BEFORE anything is created.
 *
 * `null` is treated as absent rather than as an opt-out, matching the `??` the
 * resume path uses: a chain the registry does not know still resolves to
 * `undefined` and skips the guard.
 */
export const withOriginChainId = <TParams>(
  plan: ExecutionPlan<TParams>,
): ExecutionPlan<TParams> =>
  plan.originChainId != null || !isEvmChain(plan.originChain)
    ? plan
    : { ...plan, originChainId: EVM_CHAIN_IDS[plan.originChain] };

/** The API requires `quote.deadline`; default it rather than 400. */
export const withQuoteDeadline = <TParams>(
  plan: ExecutionPlan<TParams>,
): ExecutionPlan<TParams> =>
  plan.quote.deadline
    ? plan
    : {
        ...plan,
        quote: {
          ...plan.quote,
          deadline: new Date(
            Date.now() + DEFAULT_QUOTE_DEADLINE_MS,
          ).toISOString(),
        },
      };

export const buildBody = <TParams>(
  getWallet: () => WalletConnector,
  plan: ExecutionPlan<TParams>,
  steps: Step[],
  dry: boolean,
): CreateExecutionBody => ({
  version: '1.0',
  type: plan.recipe.type,
  quote: plan.quote,
  steps,
  metadata: { title: plan.recipe.title, intent: plan.recipe.intent },
  dry,
  publicKey: PUBLIC_KEY_REQUIRED_CHAINS.has(plan.originChain)
    ? getWallet().getPublicKey?.()
    : undefined,
});

export const validateSteps = <TParams>(
  plan: ExecutionPlan<TParams>,
  steps: Step[],
): Step[] => {
  guards.stepShapeIsLegal(steps, plan.recipe.type);
  guards.destinationTokenIsTouched(steps, plan.recipe.destination.tokenAddress);

  return steps;
};
