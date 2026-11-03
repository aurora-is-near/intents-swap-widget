import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import type { Execution, PreparedSteps } from '@/types/execution';
import type { RunnerCtx } from '@/runner/ctx';
import type { Recipe } from '@/types/recipe';
import { buildOutBody, payoutStep, validateSteps } from '@/runner/planHelpers';
import type { OutOperationPlan } from '@/runner/types';

export type PlannedOut = PreparedSteps & {
  /** The fee the dry round reported. */
  networkFee: string;
  /** What the payout step sends to 1Click — the quote's amount. */
  payout: string;
  /** `amount − payout`: the most the real create's fee may be. */
  feeBudget: string;
  /** The measuring dry response. */
  execution: Execution;
};

const DEFAULT_FEE_RESERVE_BPS = 5000;

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** The real create's fee must fit the budget, and the quote echo the payout. */
export const checkOutExecution = (
  execution: Execution,
  planned: Pick<PlannedOut, 'payout' | 'feeBudget'>,
) => {
  guards.feeWithinBudget(
    guards.feeMustBeEstimated(execution),
    planned.feeBudget,
  );

  if (execution.quote?.amount !== planned.payout) {
    failGuard(
      'QUOTE_MOVED',
      `the service quoted ${String(execution.quote?.amount)} instead of the ${planned.payout} sent to 1Click`,
    );
  }
};

/**
 * Plans an out-operation. One dry create measures the fee for the recipe's
 * steps plus the payout; the payout is then sized to `amount − budget`, the
 * budget being the fee plus `feeReserveBps` of headroom, so the intermediary
 * can pay a fee that moved a little by the real create.
 */
export const planOut = async <TParams>(
  ctx: RunnerCtx,
  plan: OutOperationPlan<TParams>,
  intermediary: string,
): Promise<PlannedOut> => {
  const { api, requireAddress, to, patch, emit } = ctx;

  to('planning');

  if (plan.recipe.flow !== 'out-operation') {
    failGuard(
      'STRATEGY_CONFLICT',
      `recipe "${plan.recipe.id}" is a ${plan.recipe.flow} recipe — runOut() drives out-operation recipes`,
    );
  }

  if (plan.recipe.type !== 'evm') {
    failGuard(
      'STRATEGY_CONFLICT',
      'out-operations are supported for EVM recipes only',
    );
  }

  guards.recipientOnlyOnOutOperation(plan.recipe.flow, plan.quote.recipient);

  // Validated with the payout: it is the step that touches the destination
  // token, which a release step (a withdraw) usually does not.
  const released = (plan.recipe as Recipe<TParams>).buildSteps(
    { intermediary, userAddress: requireAddress(), amount: plan.amount },
    plan.params,
  );

  const withPayout = (payout: string): PreparedSteps =>
    validateSteps(plan, {
      steps: [...released, payoutStep(plan.recipe.destination, payout)],
    });

  // Round 1 — the whole amount out, which measures the fee.
  const measured = await api.createExecution(
    requireAddress(),
    buildOutBody(plan, withPayout(plan.amount), plan.amount, true),
  );

  ctx.throwIfDisposed();

  const networkFee = guards.feeMustBeEstimated(measured);
  const reserveBps = plan.feeReserveBps ?? DEFAULT_FEE_RESERVE_BPS;
  let budget =
    BigInt(networkFee) +
    ceilDiv(BigInt(networkFee) * BigInt(reserveBps), 10_000n);

  if (plan.maxNetworkFee !== undefined) {
    guards.feeWithinBudget(networkFee, plan.maxNetworkFee);

    if (budget > BigInt(plan.maxNetworkFee)) {
      budget = BigInt(plan.maxNetworkFee);
    }
  }

  guards.amountMustExceedFee(plan.amount, budget.toString());

  const payout = (BigInt(plan.amount) - budget).toString();
  const feeBudget = budget.toString();

  patch({ networkFee, spendable: payout, bakedAmount: payout });
  emit({ type: 'quoted', networkFee, spendable: payout });

  return {
    ...withPayout(payout),
    networkFee,
    payout,
    feeBudget,
    execution: measured,
  };
};
