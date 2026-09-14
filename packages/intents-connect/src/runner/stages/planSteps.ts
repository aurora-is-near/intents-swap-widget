import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import {
  BACKEND_PLACEHOLDERS,
  type FeeStrategy,
  type PreparedSteps,
} from '@/types/execution';
import { DEFAULT_FEE_STRATEGY } from '@/runner/constants';
import type { RunnerCtx } from '@/runner/ctx';
import {
  buildBody,
  getSpendableAmount,
  prepareRecipeSteps,
  validateSteps,
} from '@/runner/planHelpers';
import type { ExecutionPlan } from '@/runner/types';
import { getQuoteSpendable } from '@/runner/quoteAmounts';

export const planSteps = async <TParams>(
  ctx: RunnerCtx,
  plan: ExecutionPlan<TParams>,
  /**
   * Resolves to the intermediary address, supplied lazily so the threeRound
   * round-1 dry create (which takes no steps and no intermediary) can run
   * concurrently with the identity round-trip instead of after it.
   */
  resolveIntermediaryAddress: () => Promise<string>,
): Promise<PreparedSteps> => {
  const { api, getWallet, requireAddress, to, patch, emit, logger } = ctx;

  to('planning');

  const { recipe } = plan;
  const feeStrategy: FeeStrategy =
    plan.feeStrategy ??
    (recipe.type === 'solana' ? { kind: 'threeRound' } : DEFAULT_FEE_STRATEGY);

  if (recipe.type === 'solana' && feeStrategy.kind !== 'threeRound') {
    failGuard(
      'STRATEGY_CONFLICT',
      'Solana bridge-in preparation requires concrete amounts (threeRound)',
    );
  }

  const activeWallet = getWallet();

  // Bound to the connector so a class-based implementation keeps its `this`
  // when the guard invokes it bare. (The synchronous plan guards run earlier,
  // in run(), before any request is fired.)
  await guards.originNetworkMatches(
    activeWallet.getChainId?.bind(activeWallet),
    plan.originChainId,
  );

  if (plan.prepared) {
    if (plan.quote.deadline && Date.parse(plan.quote.deadline) <= Date.now()) {
      failGuard(
        'QUOTE_MOVED',
        'The prepared quote has expired; prepare a new preview',
      );
    }

    const prepared = structuredClone(plan.prepared);
    const intermediary = await resolveIntermediaryAddress();

    ctx.throwIfDisposed();
    const sameQuote = Object.keys({ ...prepared.quote, ...plan.quote }).every(
      (key) =>
        prepared.quote[key as keyof typeof prepared.quote] ===
        plan.quote[key as keyof typeof plan.quote],
    );

    if (
      prepared.walletAddress !== requireAddress() ||
      prepared.intermediary !== intermediary ||
      !sameQuote
    ) {
      failGuard(
        'QUOTE_MOVED',
        'The preview belongs to a different wallet or quote; prepare a new preview',
      );
    }

    patch({ bakedAmount: prepared.spendable, spendable: prepared.spendable });
    guards.strategiesAreExclusive(feeStrategy, prepared.steps);

    return validateSteps(plan, prepared);
  }

  // Strategy A — one round. The service substitutes the post-fee amount.
  if (feeStrategy.kind === 'placeholder') {
    const base = {
      intermediary: await resolveIntermediaryAddress(),
      userAddress: requireAddress(),
    };

    const steps = await prepareRecipeSteps(plan, {
      ...base,
      amount: BACKEND_PLACEHOLDERS.minAmountOut,
    });

    ctx.throwIfDisposed();

    guards.strategiesAreExclusive(feeStrategy, steps.steps);

    if (!guards.stepsUsePlaceholder(steps.steps)) {
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
    api.createExecution(
      requireAddress(),
      buildBody(getWallet, plan, { steps: [] }, true),
    ),
    resolveIntermediaryAddress(),
  ]);

  const base = {
    intermediary: intermediaryAddress,
    userAddress: requireAddress(),
  };

  // Round 2 — real steps at the gross amount, which measures the fee.
  ctx.throwIfDisposed();
  const probe = await prepareRecipeSteps(plan, {
    ...base,
    amount: gross.quote.minAmountOut,
  });

  ctx.throwIfDisposed();

  guards.strategiesAreExclusive(feeStrategy, probe.steps);

  const measured = await api.createExecution(
    requireAddress(),
    buildBody(getWallet, plan, validateSteps(plan, probe), true),
  );

  ctx.throwIfDisposed();
  const networkFee = guards.feeMustBeEstimated(measured);

  if (recipe.type !== 'solana') {
    guards.amountMustExceedFee(gross.quote.minAmountOut, networkFee);
  }

  // Solana returns its fee separately; EVM has already carved it from the quote.
  const spendable = getSpendableAmount(
    getQuoteSpendable(measured),
    feeStrategy,
  );

  patch({ networkFee, spendable, bakedAmount: spendable });
  emit({ type: 'quoted', networkFee, spendable });

  // Round 3 steps, rebuilt at the carved amount. The invariant now holds:
  //   spendable + networkFee <= the bridge's guaranteed delivery
  const final = await prepareRecipeSteps(plan, { ...base, amount: spendable });

  ctx.throwIfDisposed();
  guards.strategiesAreExclusive(feeStrategy, final.steps);

  return validateSteps(plan, final);
};
