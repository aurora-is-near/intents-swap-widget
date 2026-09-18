import type { StepsPreview } from '@aurora-is-near/intents-connect';

/**
 * What the balance card shows before committing a sell or a withdrawal.
 * Both actions pay out in USDC, so one shape serves both panels.
 *
 * `any` rather than `unknown` for the default: a recipe's `buildSteps` takes
 * its params, so a quote for concrete params is not assignable to one for
 * `unknown`, and the single review hook has to hold either kind.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SolanaSpendQuote<TParams = any> = {
  preview: StepsPreview<TParams>;
  /** Estimated USDC the user ends up with, atomic. */
  receive: string;
  /** Guaranteed USDC, atomic. Equals `receive` when nothing can move. */
  minimumReceive: string;
  /** Connect's fee, atomic USDC. Absent when the service estimated none. */
  networkFee?: string;
  /** Something the user should know before confirming, if anything. */
  warning?: string;
  /** Epoch ms after which the prepared steps must be previewed again. */
  expiresAt: number;
};
