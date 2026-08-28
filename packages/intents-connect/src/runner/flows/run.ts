import { failGuard, isUserRejection } from '@/errors';
import * as guards from '@/machine/guards';
import { type Execution, IN_FLIGHT_STATUSES } from '@/types/execution';
import { isSupportedSigningStandard } from '@/types/signing';
import { capture, unwrap } from '@/runner/capture';
import type { RunnerCtx } from '@/runner/ctx';
import {
  pickIntermediaryAddress,
  withOriginChainId,
  withQuoteDeadline,
} from '@/runner/planHelpers';
import { cancel } from '@/runner/stages/cancel';
import { create } from '@/runner/stages/create';
import { awaitDeposit } from '@/runner/stages/deposit';
import { fail } from '@/runner/stages/fail';
import { planSteps } from '@/runner/stages/planSteps';
import { settle } from '@/runner/stages/settle';
import { signAndSubmit } from '@/runner/stages/signAndSubmit';
import type { ExecutionPlan } from '@/runner/types';

const resolveIdentity = async (ctx: RunnerCtx) => {
  const { api, machine, state, getWallet, requireAddress, to, patch } = ctx;

  to('resolving-identity');

  // capture()d by run(), so this round-trip can outlive its flow when
  // planning dies before unwrapping it. Every reset installs a fresh context
  // object, so its identity pins the patch to THIS flow — a late response
  // must not write into a later flow's (or a disposed runner's) context.
  const flowContext = machine.context;

  const intermediary = await api.getIntermediary(requireAddress(), {
    publicKey: getWallet().getPublicKey?.(),
  });

  if (machine.context === flowContext && !state.disposed) {
    patch({ intermediary });
  }

  return intermediary;
};

export const run = async <TParams>(
  ctx: RunnerCtx,
  inputPlan: ExecutionPlan<TParams>,
): Promise<Execution> => {
  ctx.prepareForNewFlow();

  try {
    // The connector's standard must be signable BEFORE anything is created:
    // a real create for a standard we cannot sign (ton_connect, tip191)
    // would strand an execution holding the in-flight lock.
    const { signingStandard } = ctx.getWallet();

    if (!isSupportedSigningStandard(signingStandard)) {
      failGuard(
        'UNSUPPORTED_SIGNING_STANDARD',
        `this package cannot sign ${String(signingStandard)} yet — refusing to create an execution it could never complete`,
      );
    }

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

    const execution = await create(ctx, plan, steps, inFlightPreflight);

    // Retained only once an execution exists to bind it to. Assigning any
    // earlier would let a run() that dies in the guards — most commonly the
    // in-flight preflight, on a second click while a previous execution is
    // still open — clobber the plan that resume() needs to replay THAT
    // previous execution's deposit.
    ctx.setActivePlan(plan, execution.id);

    let needsDeposit: boolean;

    try {
      needsDeposit = await signAndSubmit(ctx, execution);
    } catch (error) {
      // A rejected signing prompt means the user abandoned THIS attempt —
      // but the created execution still holds the per-wallet in-flight
      // lock. Best effort: offer the delete signature right away so the
      // next run() starts clean instead of tripping EXECUTION_IN_FLIGHT
      // and demanding a resume-or-cancel decision. Declining that second
      // prompt (or any delete failure) falls back to the normal recovery,
      // with the ORIGINAL rejection as the recorded error either way.
      if (ctx.autoCancelOnSignatureRejection && isUserRejection(error)) {
        try {
          await cancel(ctx, execution.id);
        } catch (cancelError) {
          ctx.logger.warn(
            'auto-cancel after a rejected signature failed — the execution still holds the in-flight lock',
            cancelError,
          );
        }
      }

      throw error;
    }

    if (needsDeposit) {
      await awaitDeposit(ctx, plan, execution);
    }

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
