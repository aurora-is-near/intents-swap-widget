import * as guards from '@/machine/guards';
import { AWAITING_FUNDS_STATUSES, type Execution } from '@/types/execution';
import type { RunnerCtx } from '@/runner/ctx';
import { buildResumeDepositPlan } from '@/runner/depositPlan';
import { awaitDeposit, exposeDepositAddress } from '@/runner/stages/deposit';
import { fail } from '@/runner/stages/fail';
import { settle } from '@/runner/stages/settle';
import { signAndSubmit } from '@/runner/stages/signAndSubmit';
import { findTransfer } from '@/runner/transfer';
import type { ResumeDepositOptions } from '@/runner/types';

/**
 * Reattaches to an execution from an earlier session.
 *
 * Picks up from wherever it actually got rather than assuming it is already
 * settling: an execution that was signed but never funded still needs its
 * deposit address surfaced, and one that was never signed can still be signed.
 */
export const resume = async (
  ctx: RunnerCtx,
  executionId: string,
  depositOptions?: ResumeDepositOptions,
): Promise<Execution> => {
  const { api, state, requireAddress, patch } = ctx;

  ctx.prepareForNewFlow();

  try {
    const [execution] = await api.listExecutions(requireAddress(), {
      id: executionId,
    });

    if (!execution) {
      throw new Error(`no execution found for id ${executionId}`);
    }

    const { messageSigned, payload } = execution.details;

    // Sign whenever a payload is still offered and nothing says it was
    // signed. `messageSigned` alone is not trustworthy in the other
    // direction: it is optional on the wire, and inferring "signed" from a
    // non-CREATED status mislabels a deposit that was detected before the
    // signature.
    const needsSigning = messageSigned !== true && Boolean(payload);

    // An unsigned CREATED execution with no payload can never progress —
    // name that instead of polling it to a timeout.
    if (execution.status === 'CREATED' && messageSigned !== true && !payload) {
      guards.mustHaveSigningPayload(execution);
    }

    patch({
      execution,
      executionId: execution.id,
      status: execution.status,
      hasSubmittedSignature: !needsSigning,
    });

    // The awaiting-funds statuses need their deposit driven — DEPOSIT_PENDING
    // is the single most common resume case, since a failed transfer leg
    // strands an execution exactly there. EXPIRED is on top of the shared
    // set: it may be revived by a late deposit — the package's own design —
    // which requires re-surfacing the address, or the user has no means to
    // effect the revival. From DEPOSIT_PROCESSING onward the funds have been
    // observed, so prompting another transfer would double-spend.
    let needsDeposit =
      AWAITING_FUNDS_STATUSES.includes(execution.status) ||
      execution.status === 'EXPIRED';

    if (needsSigning) {
      // ANDed, never overwritten: /submit's answer distinguishes "still needs
      // a deposit" from "out-operation, nothing to deposit" — it cannot
      // re-enable the transfer for an execution whose funds were already
      // observed before the signature (the double-spend the initialisation
      // above rules out).
      needsDeposit = (await signAndSubmit(ctx, execution)) && needsDeposit;
    }

    if (needsDeposit && execution.quote.depositAddress) {
      // Same-session resume: this runner created the execution and still
      // holds its plan, so the wallet deposit itself can be replayed — the
      // recovery path for "rejected the signature, trying again".
      const drivenHere = state.activePlanExecutionId === execution.id;

      // A deposit this runner already broadcast must never be sent again,
      // whatever the status now reads: DEPOSIT_PENDING means the watcher has
      // not caught up, and EXPIRED means the deadline passed first — the very
      // state a late deposit revives. Keyed on the broadcast itself rather
      // than on a list of statuses, so a new awaiting-funds status cannot
      // silently reopen the window.
      const alreadySent = state.depositSentExecutionIds.has(execution.id);

      // Without that local record the two cases are indistinguishable from
      // the status alone — a reload loses it — so a cross-session resume needs
      // the caller to say the transfer is safe to (re-)send. CREATED is
      // exempt: it is unsigned, so no deposit can have been made yet.
      const needsSendPermission =
        !drivenHere &&
        execution.status !== 'CREATED' &&
        depositOptions?.depositViaWallet !== true;

      const depositMayBeInFlight = alreadySent || needsSendPermission;

      // `depositViaWallet: false` is an UNCONDITIONAL opt-out, so it gates the
      // retained plan as well as the rebuilt one. `buildResumeDepositPlan`
      // honours it on its own; without the same gate here, a caller switching a
      // same-session execution to the QR / exchange path would still be
      // prompted for a wallet transfer, because the retained plan carries the
      // original run's `depositViaWallet: true`.
      const optedOutOfWalletDeposit =
        depositOptions?.depositViaWallet === false;

      let plan =
        drivenHere && !optedOutOfWalletDeposit ? state.activePlan : undefined;

      if (!plan) {
        // Cross-session resume: the plan is gone (page reload), but the
        // deposit leg can usually be rebuilt from the execution itself.
        const rebuilt = buildResumeDepositPlan(execution, depositOptions);

        if (rebuilt && findTransfer(ctx, rebuilt.originChain)) {
          plan = rebuilt;
        }
      }

      if (plan && !depositMayBeInFlight) {
        // Retained so a failed transfer stays retryable via retryDeposit().
        ctx.setActivePlan(plan, execution.id);

        await awaitDeposit(ctx, plan, execution);
      } else {
        // No plan to drive a transfer from, or one that must not be driven
        // unprompted — surface the address instead. The settle loop below
        // still watches for the deposit, so a transfer already in flight
        // completes normally; a caller that knows none was sent re-drives it
        // with `depositViaWallet: true`.
        // exposeDepositAddress derives the origin chain from the execution
        // (or the SIGNING_STANDARD_CHAINS fallback) and enforces the memo
        // guard itself.
        exposeDepositAddress(ctx, execution);
      }
    }

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
