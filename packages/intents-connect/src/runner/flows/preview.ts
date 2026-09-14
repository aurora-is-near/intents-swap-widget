import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import { createExecutionMachine, moveTo } from '@/machine/machine';
import type { RunnerCtx } from '@/runner/ctx';
import type { Execution } from '@/types/execution';
import {
  buildBody,
  getSpendableAmount,
  pickIntermediaryAddress,
  prepareRecipeSteps,
  withOriginChainId,
  withQuoteDeadline,
} from '@/runner/planHelpers';
import { planSteps } from '@/runner/stages/planSteps';
import { validatePreparedExecution } from '@/runner/stages/validatePreparedExecution';
import type { ExecutionPlan, ExecutionPreview } from '@/runner/types';
import { getQuoteSpendable } from '@/runner/quoteAmounts';

const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }

  return value;
};

/** An isolated planning machine: no real create, signatures, deposit, or live runner events. */
export const preview = async <TParams>(
  ctx: RunnerCtx,
  input: ExecutionPlan<TParams>,
): Promise<ExecutionPreview<TParams>> => {
  ctx.throwIfDisposed();
  const address = ctx.requireAddress();
  const requireAddress = () => {
    ctx.throwIfDisposed();

    if (ctx.requireAddress() !== address) {
      failGuard(
        'WALLET_NOT_CONNECTED',
        'Wallet changed while preparing the preview',
      );
    }

    return address;
  };

  const plan = withOriginChainId(
    withQuoteDeadline({
      ...input,
      quote: { ...input.quote },
      prepared: undefined,
    }),
  );

  guards.recipientOnlyOnOutOperation(plan.recipe.flow, plan.quote.recipient);
  const machine = createExecutionMachine();
  const local: RunnerCtx = {
    ...ctx,
    machine,
    requireAddress,
    patch: (values) => {
      Object.assign(machine.context, values);
    },
    emit: () => undefined,
    to: (phase) => moveTo(machine, phase, { logger: ctx.logger }),
  };

  local.to('resolving-identity');
  const intermediary = await ctx.api.getIntermediary(requireAddress(), {
    publicKey: ctx.getWallet().getPublicKey?.(),
  });

  const intermediaryAddress = pickIntermediaryAddress(plan, intermediary);
  let prepared = await planSteps(local, plan, async () => intermediaryAddress);

  let spendable = machine.context.bakedAmount;

  // A dry response can move while the caller fetches concrete instructions.
  // Rebuild only unsigned previews, at most twice; run() retains the accepted
  // steps verbatim and still refuses an underfunded real execution.
  const confirm = async (rebuildsLeft: number): Promise<Execution> => {
    guards.stepsRequiredForRealCreate(prepared.steps);
    const execution = await ctx.api.createExecution(
      requireAddress(),
      buildBody(ctx.getWallet, plan, prepared, true),
    );

    requireAddress();
    const currentSpendable =
      plan.recipe.type === 'solana' ? getQuoteSpendable(execution) : undefined;

    if (
      plan.recipe.type === 'solana' &&
      spendable !== undefined &&
      currentSpendable !== undefined &&
      BigInt(currentSpendable) < BigInt(spendable)
    ) {
      if (rebuildsLeft === 0) {
        return failGuard(
          'QUOTE_MOVED',
          'The bridge quote kept changing while preparing the swap; get a new quote',
        );
      }

      spendable = getSpendableAmount(currentSpendable, plan.feeStrategy);
      prepared = await prepareRecipeSteps(plan, {
        intermediary: intermediaryAddress,
        userAddress: requireAddress(),
        amount: spendable,
      });
      requireAddress();
      guards.strategiesAreExclusive({ kind: 'threeRound' }, prepared.steps);

      return confirm(rebuildsLeft - 1);
    }

    validatePreparedExecution(execution, spendable);

    return execution;
  };

  const execution = await confirm(2);

  return {
    execution,
    spendable,
    plan: {
      ...plan,
      prepared: freeze(
        structuredClone({
          ...prepared,
          walletAddress: address,
          intermediary: intermediaryAddress,
          quote: plan.quote,
          spendable,
        }),
      ),
    },
  };
};
