import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import type { Execution } from '@/types/execution';
import { DEFAULT_PREVIEW_TTL_MS } from '@/runner/constants';
import type { RunnerCtx } from '@/runner/ctx';
import { createIsolatedCtx, freeze } from '@/runner/isolated';
import {
  buildStepsBody,
  pickIntermediaryAddress,
  prepareRecipeSteps,
} from '@/runner/planHelpers';
import {
  type PlannedSteps,
  planStepsOnly,
  spendableAfterFee,
} from '@/runner/stages/planStepsOnly';
import type { StepsPlan, StepsPreview } from '@/runner/types';

/**
 * Dry preparation of a steps-only execution on an isolated machine: no real
 * create, no signature, no live runner events.
 *
 * The returned plan carries an immutable `prepared` snapshot that
 * `runSteps()` commits verbatim until `expiresAt`.
 */
export const previewSteps = async <TParams>(
  ctx: RunnerCtx,
  input: StepsPlan<TParams>,
): Promise<StepsPreview<TParams>> => {
  const local = createIsolatedCtx(ctx);
  const { requireAddress } = local;
  const plan: StepsPlan<TParams> = { ...input, prepared: undefined };

  local.to('resolving-identity');
  const intermediary = await ctx.api.getIntermediary(requireAddress(), {
    publicKey: ctx.getWallet().getPublicKey?.(),
  });

  const intermediaryAddress = pickIntermediaryAddress(plan, intermediary);
  let planned = await planStepsOnly(local, plan, intermediaryAddress);

  // Only a fee carved from the spent amount changes the steps, so only that
  // shape needs a confirming dry at the amount actually baked in. Rebuild at
  // the new fee at most twice; runSteps() refuses an over-budget real create
  // regardless. Every other plan was fully priced by the measuring dry.
  const confirm = async (rebuildsLeft: number): Promise<Execution> => {
    const execution = await ctx.api.createStepsExecution(
      requireAddress(),
      buildStepsBody(plan, planned, true, { feeBudget: planned.feeBudget }),
    );

    requireAddress();
    const fee = guards.feeMustBeEstimated(execution);

    if (
      planned.feeBudget !== undefined &&
      BigInt(fee) > BigInt(planned.feeBudget)
    ) {
      if (rebuildsLeft === 0) {
        return failGuard(
          'FEE_EXCEEDS_AMOUNT',
          `network fee (${fee}) exceeds the budget the steps were sized for (${planned.feeBudget}); get a new preview`,
        );
      }

      const spendable = spendableAfterFee(plan, fee);
      const rebuilt = await prepareRecipeSteps(plan, {
        intermediary: intermediaryAddress,
        userAddress: requireAddress(),
        amount: spendable,
      });

      requireAddress();
      guards.strategiesAreExclusive({ kind: 'threeRound' }, rebuilt.steps);

      planned = {
        ...rebuilt,
        networkFee: fee,
        spendable,
        feeBudget: (BigInt(plan.amount) - BigInt(spendable)).toString(),
      } satisfies PlannedSteps;

      return confirm(rebuildsLeft - 1);
    }

    return execution;
  };

  const execution = plan.feeFromAmount
    ? await confirm(2)
    : // Never undefined here: only the `prepared` path omits it, and this
      // preview cleared `prepared` above.
      planned.execution!;

  const {
    networkFee,
    spendable,
    feeBudget,
    execution: _measured,
    ...prepared
  } = planned;

  return {
    execution,
    networkFee,
    spendable,
    plan: {
      ...plan,
      prepared: freeze(
        structuredClone({
          ...prepared,
          walletAddress: requireAddress(),
          intermediary: intermediaryAddress,
          amount: plan.amount,
          spendable,
          networkFee,
          feeBudget,
          expiresAt: new Date(
            Date.now() + (plan.previewTtlMs ?? DEFAULT_PREVIEW_TTL_MS),
          ).toISOString(),
        }),
      ),
    },
  };
};
