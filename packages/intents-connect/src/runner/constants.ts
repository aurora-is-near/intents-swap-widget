import type { FeeStrategy } from '@/types/execution';

export const DEFAULT_POLL_INTERVAL_MS = 3_000;
export const DEFAULT_MAX_POLL_ATTEMPTS = 240;
export const DEFAULT_FEE_STRATEGY: FeeStrategy = { kind: 'placeholder' };
/** Applied when the caller supplies no `quote.deadline` — the API requires one. */
export const DEFAULT_QUOTE_DEADLINE_MS = 10 * 60_000;
/**
 * How long past `quote.deadline` the deposit wait keeps polling before the
 * regular attempt budget takes over — covers clock skew and a deposit sent at
 * the last second that the watcher has not observed yet.
 */
export const DEPOSIT_DEADLINE_GRACE_MS = 5 * 60_000;
/**
 * Transient poll failures tolerated in a row. A single network blip must not
 * report a live execution as failed; a persistently unreachable API must.
 */
export const MAX_CONSECUTIVE_POLL_ERRORS = 5;
/**
 * While holding for user funds (QR / exchange deposits) the poll interval
 * grows by this factor per poll, capped below — the hold spans the quote
 * deadline plus grace (~15 minutes by default), and detection latency during
 * a multi-minute exchange transfer is irrelevant. The interval snaps back to
 * `pollIntervalMs` the moment the hold ends.
 */
export const HOLDING_POLL_BACKOFF_FACTOR = 1.5;
export const MAX_HOLDING_POLL_INTERVAL_MS = 30_000;
/**
 * How long a new flow waits for a CANCELLED one to release the flow lock
 * before refusing. The cancelled flow usually unwinds in a few microtask hops,
 * but one parked on an open wallet prompt only settles when the user dismisses
 * it — and nothing can abort that from here, so the wait must be bounded.
 */
export const DOOMED_FLOW_SETTLE_TIMEOUT_MS = 10_000;
