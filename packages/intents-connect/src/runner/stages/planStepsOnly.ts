import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import type { Execution, FeeStrategy, PreparedSteps } from '@/types/execution';
import type { RunnerCtx } from '@/runner/ctx';
import {
  buildStepsBody,
  getSpendableAmount,
  prepareRecipeSteps,
  validateSteps,
} from '@/runner/planHelpers';
import type { StepsPlan } from '@/runner/types';

export type PlannedSteps = PreparedSteps & {
  /**
   * The fee the dry round reported. Absent only when the plan does not carve
   * the fee from `amount` AND the service did not estimate one — the steps
   * are still committable, the caller just cannot display a figure.
   */
  networkFee?: string;
  /** The amount baked into the steps. */
  spendable: string;
  /** Cap on the real create's fee; absent means any fee is accepted. */
  feeBudget?: string;
  /** The measuring dry response; absent when a `prepared` snapshot was reused. */
  execution?: Execution;
};

/** Steps-only steps carry literal amounts: there is no quote to substitute into. */
const LITERAL_AMOUNTS: FeeStrategy = { kind: 'threeRound' };

const reserveStrategy = <TParams>(plan: StepsPlan<TParams>): FeeStrategy => ({
  kind: 'threeRound',
  amountReserveBps:
    typeof plan.feeFromAmount === 'object'
      ? plan.feeFromAmount.amountReserveBps
      : undefined,
});

/**
 * The spendable amount once the fee is carved from `amount`, less the reserve.
 * Only meaningful when the fee is charged in the token the steps spend.
 */
export const spendableAfterFee = <TParams>(
  plan: StepsPlan<TParams>,
  networkFee: string,
): string => {
  guards.amountMustExceedFee(plan.amount, networkFee);

  return getSpendableAmount(
    (BigInt(plan.amount) - BigInt(networkFee)).toString(),
    reserveStrategy(plan),
  );
};

/**
 * Whether a steps-only response's fee is acceptable for `plan`.
 *
 * Carving the fee from the spent amount needs the figure, so its absence is
 * a failed estimation. Otherwise the fee comes out of what the steps produce
 * and the service appends its transfer regardless, so a missing estimate only
 * costs the caller a displayable number — unless they capped it, in which
 * case a reported fee must fit the cap.
 */
export const checkStepsFee = <TParams>(
  plan: StepsPlan<TParams>,
  execution: Execution,
  budget: string | undefined,
): string | undefined => {
  if (plan.feeFromAmount) {
    const fee = guards.feeMustBeEstimated(execution);

    if (budget !== undefined) {
      guards.feeWithinBudget(fee, budget);
    }

    return fee;
  }

  const fee = execution.details.networkFee;

  if (fee === undefined) {
    return undefined;
  }

  if (budget !== undefined) {
    guards.feeWithinBudget(guards.feeMustBeEstimated(execution), budget);
  }

  return fee;
};

/**
 * Plans a steps-only execution.
 *
 * One dry round measures the fee (there is no step-less estimation round:
 * the endpoint prices the steps themselves). When the fee comes out of the
 * spent token, the steps are rebuilt at the post-fee amount; otherwise the
 * caller's amount is final and only the optional fee cap applies.
 *
 * A `prepared` snapshot from `previewSteps()` skips all of that and is
 * committed verbatim, after checking it still describes this wallet, this
 * intermediary and this amount — and has not expired.
 */
export const planStepsOnly = async <TParams>(
  ctx: RunnerCtx,
  plan: StepsPlan<TParams>,
  intermediary: string,
): Promise<PlannedSteps> => {
  const { api, requireAddress, to, patch, emit, logger } = ctx;

  to('planning');

  if (plan.recipe.flow !== 'steps-only') {
    failGuard(
      'STRATEGY_CONFLICT',
      `recipe "${plan.recipe.id}" is a ${plan.recipe.flow} recipe — runSteps() drives steps-only recipes`,
    );
  }

  if (plan.prepared) {
    const prepared = structuredClone(plan.prepared);

    if (Date.parse(prepared.expiresAt) <= Date.now()) {
      failGuard(
        'QUOTE_MOVED',
        'The prepared steps preview has expired; prepare a new preview',
      );
    }

    if (
      prepared.walletAddress !== requireAddress() ||
      prepared.intermediary !== intermediary ||
      prepared.amount !== plan.amount
    ) {
      failGuard(
        'QUOTE_MOVED',
        'The preview belongs to a different wallet, intermediary or amount; prepare a new preview',
      );
    }

    guards.strategiesAreExclusive(LITERAL_AMOUNTS, prepared.steps);
    patch({
      networkFee: prepared.networkFee,
      spendable: prepared.spendable,
      bakedAmount: prepared.spendable,
    });

    return {
      ...validateSteps(plan, prepared),
      networkFee: prepared.networkFee,
      spendable: prepared.spendable,
      feeBudget: prepared.feeBudget,
    };
  }

  const base = { intermediary, userAddress: requireAddress() };

  // Round 1 — the steps at the gross amount, which measures the fee.
  const probe = await prepareRecipeSteps(plan, {
    ...base,
    amount: plan.amount,
  });

  ctx.throwIfDisposed();
  guards.strategiesAreExclusive(LITERAL_AMOUNTS, probe.steps);
  guards.stepsRequiredForRealCreate(probe.steps);

  const measured = await api.createStepsExecution(
    requireAddress(),
    buildStepsBody(plan, probe, true),
  );

  ctx.throwIfDisposed();

  let spendable = plan.amount;
  let feeBudget = plan.maxNetworkFee;
  let final = probe;
  const networkFee = checkStepsFee(plan, measured, feeBudget);

  if (plan.feeFromAmount && networkFee !== undefined) {
    // Round 2 — rebuilt at the carved amount, so `spendable + fee <= amount`.
    spendable = spendableAfterFee(plan, networkFee);
    feeBudget = (BigInt(plan.amount) - BigInt(spendable)).toString();
    final = await prepareRecipeSteps(plan, { ...base, amount: spendable });

    ctx.throwIfDisposed();
    guards.strategiesAreExclusive(LITERAL_AMOUNTS, final.steps);
  }

  patch({ networkFee, spendable, bakedAmount: spendable });

  if (networkFee !== undefined) {
    emit({ type: 'quoted', networkFee, spendable });
  } else {
    logger.warn(
      `steps-only dry create for recipe "${plan.recipe.id}" reported no networkFee — the service still appends its fee transfer, but no figure can be shown`,
    );
  }

  return { ...final, networkFee, spendable, feeBudget, execution: measured };
};
