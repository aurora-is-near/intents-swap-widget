import type { ExecutionPlan } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

/**
 * How long a transfer's deposit address takes funds: long enough for an
 * exchange withdrawal. The service accepts it (checked by dry create).
 */
export const TRANSFER_WINDOW_MS = 30 * 60_000;

/**
 * `plan` funded by a transfer: no wallet deposit, and a deadline
 * `TRANSFER_WINDOW_MS` from `now`.
 */
export const withTransferFunding = <TParams>(
  plan: ExecutionPlan<TParams>,
  now: number = Date.now(),
): ExecutionPlan<TParams> => ({
  ...plan,
  depositViaWallet: false,
  quote: {
    ...plan.quote,
    deadline: new Date(now + TRANSFER_WINDOW_MS).toISOString(),
  },
});

/**
 * A runner for `useQuotePreview` that previews every plan as a transfer.
 * The dApp's plan object stays the same, so a refresh doesn't drop the
 * shown quote, and each refresh stamps a fresh window. The preview's plan
 * carries both fields, so running it runs a transfer.
 */
export const transferPreviewer = (
  exec: Pick<UseExecutionResult, 'preview'>,
): Pick<UseExecutionResult, 'preview'> => ({
  preview: (plan) => exec.preview(withTransferFunding(plan)),
});
