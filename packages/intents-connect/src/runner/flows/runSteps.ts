import { type Execution, IN_FLIGHT_STATUSES } from '@/types/execution';
import { capture } from '@/runner/capture';
import type { RunnerCtx } from '@/runner/ctx';
import {
  assertSignableStandard,
  resolveIdentity,
  signAndSubmitOrCancel,
} from '@/runner/identity';
import { buildStepsBody, pickIntermediaryAddress } from '@/runner/planHelpers';
import { create } from '@/runner/stages/create';
import { fail } from '@/runner/stages/fail';
import { checkStepsFee, planStepsOnly } from '@/runner/stages/planStepsOnly';
import { settle } from '@/runner/stages/settle';
import type { StepsPlan } from '@/runner/types';

/**
 * Steps-only lifecycle: the intermediary already holds the funds, so there is
 * no quote and no deposit leg —
 *
 *   resolving-identity → planning → creating → awaiting-signature
 *     → submitting → settling → success | failed
 */
export const runSteps = async <TParams>(
  ctx: RunnerCtx,
  plan: StepsPlan<TParams>,
): Promise<Execution> => {
  ctx.prepareForNewFlow();

  try {
    assertSignableStandard(ctx);

    // Fired now and unwrapped inside create(): see run() for why.
    const inFlightPreflight = capture(
      ctx.api.listExecutions(ctx.requireAddress(), {
        status: IN_FLIGHT_STATUSES,
      }),
    );

    const intermediary = pickIntermediaryAddress(
      plan,
      await resolveIdentity(ctx),
    );

    const planned = await planStepsOnly(ctx, plan, intermediary);
    const { feeBudget } = planned;

    const execution = await create(
      ctx,
      {
        prepared: planned,
        submit: (address) =>
          ctx.api.createStepsExecution(
            address,
            buildStepsBody(plan, planned, false, { feeBudget }),
          ),
        accept: (created) => {
          checkStepsFee(plan, created, feeBudget);
        },
        validateExecution: plan.validateExecution,
      },
      inFlightPreflight,
    );

    // /submit answers SIGNING (or an operation status) for an execution with
    // nothing to deposit; whatever it says, there is no deposit leg here.
    await signAndSubmitOrCancel(ctx, execution);

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
