import * as guards from '@/machine/guards';
import { type Execution, IN_FLIGHT_STATUSES } from '@/types/execution';
import { capture, unwrap } from '@/runner/capture';
import type { RunnerCtx } from '@/runner/ctx';
import {
  assertSignableStandard,
  resolveIdentity,
  signAndSubmitOrCancel,
} from '@/runner/identity';
import {
  buildBody,
  pickIntermediaryAddress,
  withOriginChainId,
  withQuoteDeadline,
} from '@/runner/planHelpers';
import { create } from '@/runner/stages/create';
import { awaitDeposit } from '@/runner/stages/deposit';
import { fail } from '@/runner/stages/fail';
import { planSteps } from '@/runner/stages/planSteps';
import { settle } from '@/runner/stages/settle';
import { validatePreparedExecution } from '@/runner/stages/validatePreparedExecution';
import type { ExecutionPlan } from '@/runner/types';

export const run = async <TParams>(
  ctx: RunnerCtx,
  inputPlan: ExecutionPlan<TParams>,
): Promise<Execution> => {
  ctx.prepareForNewFlow();

  try {
    assertSignableStandard(ctx);

    // Normalised ONCE, before anything reads it: the normalised plan is what
    // planning guards against, what the deposit transfer runs on, and what
    // `setActivePlan` retains for `retryDeposit()` / a same-session `resume()`.
    const plan = withOriginChainId(withQuoteDeadline(inputPlan));

    // Synchronous plan validation runs BEFORE any request is fired, so a
    // misconfigured recipe costs zero API calls (and zero per retry click).
    guards.recipientOnlyOnOutOperation(plan.recipe.flow, plan.quote.recipient);

    // Fired now and unwrapped inside create(): the preflight needs only the
    // address, so it runs alongside identity resolution and planning instead
    // of adding a serial round-trip right before the wallet prompt. Captured,
    // so a flow that dies earlier cannot turn a lost preflight into an
    // unhandled rejection.
    const inFlightPreflight = capture(
      ctx.api.listExecutions(ctx.requireAddress(), {
        status: IN_FLIGHT_STATUSES,
      }),
    );

    // Captured for the same reason. Planning only needs the intermediary from
    // round 2 of the threeRound protocol onward, so the resolver lets round 1
    // race it; a rejection re-surfaces at the resolver's await, which every
    // planning path reaches.
    const identity = capture(resolveIdentity(ctx));

    const steps = await planSteps(ctx, plan, async () =>
      pickIntermediaryAddress(plan, unwrap(await identity)),
    );

    // Save the amount beside the signed instructions so an unsigned resume
    // rechecks the same funding guarantee, including after a reload.
    const executionPlan = {
      ...plan,
      prepared: {
        ...steps,
        spendable: ctx.machine.context.bakedAmount,
        walletAddress: ctx.requireAddress(),
        intermediary: pickIntermediaryAddress(plan, unwrap(await identity)),
        quote: plan.quote,
      },
    };

    const execution = await create(
      ctx,
      {
        prepared: steps,
        submit: (address) =>
          ctx.api.createExecution(
            address,
            buildBody(ctx.getWallet, executionPlan, steps, false),
          ),
        accept: (created) =>
          validatePreparedExecution(created, ctx.machine.context.bakedAmount),
        validateExecution: plan.validateExecution,
      },
      inFlightPreflight,
    );

    // Retained only once an execution exists to bind it to. Assigning any
    // earlier would let a run() that dies in the guards — most commonly the
    // in-flight preflight, on a second click while a previous execution is
    // still open — clobber the plan that resume() needs to replay THAT
    // previous execution's deposit.
    ctx.setActivePlan(plan, execution.id);

    const needsDeposit = await signAndSubmitOrCancel(ctx, execution);

    if (needsDeposit) {
      await awaitDeposit(ctx, plan, execution);
    }

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
