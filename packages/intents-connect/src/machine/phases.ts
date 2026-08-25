/**
 * Client-side phases — what a UI renders.
 *
 * Distinct from `ExecutionStatus`, which is the server's view and only exists
 * from `creating` onward.
 */
export type Phase =
  | 'idle'
  /** GET /intermediary — deterministic, cached per wallet. */
  | 'resolving-identity'
  /** Build steps and size the amount against the fee (0 or 2 dry rounds). */
  | 'planning'
  /** POST create, dry: false. */
  | 'creating'
  /** Waiting on the wallet prompt. */
  | 'awaiting-signature'
  /** POST /submit. */
  | 'submitting'
  /** User sends funds — wallet transfer or QR / exchange. */
  | 'awaiting-deposit'
  /** Polling to a terminal status. */
  | 'settling'
  | 'success'
  | 'failed'
  | 'expired'
  | 'cancelled';

/**
 * Legal transitions.
 *
 * Two entries carry non-obvious behaviour:
 *
 * - `submitting` FORKS. v1 is bridge-in so it always needs a deposit, but the
 *   direct edge to `settling` is modelled now because out-operations answer
 *   `SIGNING` from /submit and skip the deposit phase entirely.
 * - `expired` re-enters `settling`. `EXPIRED` looks terminal but is not: a
 *   deposit that settles late revives an execution straight to
 *   `OPERATION_PROCESSING`.
 * - `idle` may go directly to `awaiting-signature`, `awaiting-deposit` or
 *   `settling`. Those are `resume()` re-entry points: identity and planning
 *   already happened in an earlier session, so replaying them would emit events
 *   for work this runner never did. Which one it enters depends on how far the
 *   execution actually got.
 * - `idle` may also go to `failed`, because `run()` and `resume()` can both fail
 *   on their very first call (an unknown execution id, a disconnected wallet)
 *   and must still record the error rather than silently staying idle.
 * - EVERY non-terminal phase may go to `cancelled`. `cancel()` is the user's
 *   escape hatch from a stuck execution and can be invoked at any point after
 *   an execution id exists — refusing the transition from any live phase would
 *   leave the machine claiming an execution that was already deleted.
 */
export const PHASE_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  idle: [
    'resolving-identity',
    'awaiting-signature',
    'awaiting-deposit',
    'settling',
    'failed',
    'cancelled',
  ],
  'resolving-identity': ['planning', 'failed', 'cancelled'],
  planning: ['creating', 'failed', 'cancelled'],
  creating: ['awaiting-signature', 'failed', 'cancelled'],
  'awaiting-signature': ['submitting', 'failed', 'cancelled'],
  submitting: ['awaiting-deposit', 'settling', 'failed', 'cancelled'],
  'awaiting-deposit': ['settling', 'expired', 'cancelled', 'failed'],
  settling: ['success', 'failed', 'expired', 'cancelled'],
  expired: ['settling', 'failed', 'cancelled'],
  success: [],
  failed: [],
  cancelled: [],
};

export const TERMINAL_PHASES: readonly Phase[] = [
  'success',
  'failed',
  'cancelled',
];

export const isTerminalPhase = (phase: Phase): boolean =>
  TERMINAL_PHASES.includes(phase);
