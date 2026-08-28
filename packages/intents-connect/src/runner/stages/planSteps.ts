import * as guards from '@/machine/guards';
import { BACKEND_PLACEHOLDERS, type Step } from '@/types/execution';
import { DEFAULT_FEE_STRATEGY } from '@/runner/constants';
import type { RunnerCtx } from '@/runner/ctx';
import { buildBody, validateSteps } from '@/runner/planHelpers';
import type { ExecutionPlan } from '@/runner/types';

export const planSteps = async <TParams>(
  ctx: RunnerCtx,
  plan: ExecutionPlan<TParams>,
  /**
   * Resolves to the intermediary address, supplied lazily so the threeRound
   * round-1 dry create (which takes no steps and no intermediary) can run
   * concurrently with the identity round-trip instead of after it.
   */
  resolveIntermediaryAddress: () => Promise<string>,
): Promise<Step[]> => {
  const { api, getWallet, requireAddress, to, patch, emit, logger } = ctx;

  to('planning');

  const { recipe, params } = plan;
  const feeStrategy = plan.feeStrategy ?? DEFAULT_FEE_STRATEGY;
  const activeWallet = getWallet();

  // Bound to the connector so a class-based implementation keeps its `this`
  // when the guard invokes it bare. (The synchronous plan guards run earlier,
  // in run(), before any request is fired.)
  await guards.originNetworkMatches(
    activeWallet.getChainId?.bind(activeWallet),
    plan.originChainId,
  );

  // Strategy A — one round. The service substitutes the post-fee amount.
  if (feeStrategy.kind === 'placeholder') {
    const base = {
      intermediary: await resolveIntermediaryAddress(),
      userAddress: requireAddress(),
    };

    const steps = recipe.buildSteps(
      { ...base, amount: BACKEND_PLACEHOLDERS.minAmountOut },
      params,
    );

    guards.strategiesAreExclusive(feeStrategy, steps);

    if (!guards.stepsUsePlaceholder(steps)) {
      logger.warn(
        `recipe "${recipe.id}" ignored ctx.amount under the placeholder fee strategy, so the service has no amount to substitute — intended only if its amounts are deliberately fixed`,
      );
    }

    return validateSteps(plan, steps);
  }

  // Strategy B — three rounds, so an exact figure can be shown pre-signature.
  // Round 1 is step-less (steps: []): gas estimation only runs with non-empty
  // steps, so this is what yields an un-carved quote. It needs no
  // intermediary either, so it races the identity round-trip.
  const [gross, intermediaryAddress] = await Promise.all([
    api.createExecution(requireAddress(), buildBody(getWallet, plan, [], true)),
    resolveIntermediaryAddress(),
  ]);

  const base = {
    intermediary: intermediaryAddress,
    userAddress: requireAddress(),
  };

  // Round 2 — real steps at the gross amount, which measures the fee.
  const probe = recipe.buildSteps(
    { ...base, amount: gross.quote.minAmountOut },
    params,
  );

  guards.strategiesAreExclusive(feeStrategy, probe);

  const measured = await api.createExecution(
    requireAddress(),
    buildBody(getWallet, plan, validateSteps(plan, probe), true),
  );

  const networkFee = guards.feeMustBeEstimated(measured);

  guards.amountMustExceedFee(gross.quote.minAmountOut, networkFee);

  // Already post-fee — do NOT subtract again.
  const spendable = measured.quote.minAmountOut;

  patch({ networkFee, spendable, bakedAmount: spendable });
  emit({ type: 'quoted', networkFee, spendable });

  // Round 3 steps, rebuilt at the carved amount. The invariant now holds:
  //   spendable + networkFee === the bridge's guaranteed delivery
  const final = recipe.buildSteps({ ...base, amount: spendable }, params);

  return validateSteps(plan, final);
};
