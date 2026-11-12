import { type Execution, IN_FLIGHT_STATUSES } from '@/types/execution';
import { capture } from '@/runner/capture';
import type { RunnerCtx } from '@/runner/ctx';
import {
  assertSignableStandard,
  resolveIdentity,
  signAndSubmitOrCancel,
} from '@/runner/identity';
import { buildOutBody, pickIntermediaryAddress } from '@/runner/planHelpers';
import { create } from '@/runner/stages/create';
import { fail } from '@/runner/stages/fail';
import { checkOutExecution, planOut } from '@/runner/stages/planOut';
import { settle } from '@/runner/stages/settle';
import type { OutOperationPlan } from '@/runner/types';

/**
 * Out-operation lifecycle: the steps run where the intermediary holds the
 * funds and pay them out through 1Click, so there is no deposit leg —
 *
 *   resolving-identity → planning → creating → awaiting-signature
 *     → submitting → settling → success | failed
 */
export const runOut = async <TParams>(
  ctx: RunnerCtx,
  plan: OutOperationPlan<TParams>,
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

    const planned = await planOut(ctx, plan, intermediary);

    const execution = await create(
      ctx,
      {
        prepared: planned,
        submit: (address) =>
          ctx.api.createExecution(
            address,
            buildOutBody(plan, planned, planned.payout, false, {
              feeBudget: planned.feeBudget,
            }),
          ),
        accept: (created) => checkOutExecution(created, planned),
        validateExecution: plan.validateExecution,
      },
      inFlightPreflight,
    );

    // /submit answers SIGNING (or an operation status): nothing to deposit.
    await signAndSubmitOrCancel(ctx, execution);

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
