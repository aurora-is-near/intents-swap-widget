import { failGuard, isUserRejection } from '@/errors';
import type { Execution, Intermediary } from '@/types/execution';
import { isSupportedSigningStandard } from '@/types/signing';
import type { RunnerCtx } from '@/runner/ctx';
import { cancel } from '@/runner/stages/cancel';
import { signAndSubmit } from '@/runner/stages/signAndSubmit';

/** GET /intermediary, patched into the flow's context if it is still live. */
export const resolveIdentity = async (
  ctx: RunnerCtx,
): Promise<Intermediary> => {
  const { api, machine, state, getWallet, requireAddress, to, patch } = ctx;

  to('resolving-identity');

  // capture()d by the flow, so this round-trip can outlive it when planning
  // dies before unwrapping it. Every reset installs a fresh context object,
  // so its identity pins the patch to THIS flow — a late response must not
  // write into a later flow's (or a disposed runner's) context.
  const flowContext = machine.context;

  const intermediary = await api.getIntermediary(requireAddress(), {
    publicKey: getWallet().getPublicKey?.(),
  });

  if (machine.context === flowContext && !state.disposed) {
    patch({ intermediary });
  }

  return intermediary;
};

/**
 * The connector's standard must be signable BEFORE anything is created: a
 * real create for a standard we cannot sign (ton_connect, tip191) would
 * strand an execution holding the in-flight lock.
 */
export const assertSignableStandard = (ctx: RunnerCtx) => {
  const { signingStandard } = ctx.getWallet();

  if (!isSupportedSigningStandard(signingStandard)) {
    failGuard(
      'UNSUPPORTED_SIGNING_STANDARD',
      `this package cannot sign ${String(signingStandard)} yet — refusing to create an execution it could never complete`,
    );
  }
};

/**
 * `signAndSubmit`, plus the recovery for a rejected prompt.
 *
 * A rejected signing prompt means the user abandoned THIS attempt — but the
 * created execution still holds the per-wallet in-flight lock. Best effort:
 * offer the delete signature right away so the next flow starts clean instead
 * of tripping EXECUTION_IN_FLIGHT and demanding a resume-or-cancel decision.
 * Declining that second prompt (or any delete failure) falls back to the
 * normal recovery, with the ORIGINAL rejection as the recorded error either
 * way.
 */
export const signAndSubmitOrCancel = async (
  ctx: RunnerCtx,
  execution: Execution,
): Promise<boolean> => {
  try {
    return await signAndSubmit(ctx, execution);
  } catch (error) {
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
};
