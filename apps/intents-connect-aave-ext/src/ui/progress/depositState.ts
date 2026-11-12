import type { ExecutionStatus, Phase } from '@aurora-is-near/intents-connect';

/** What the deposit panel of a transfer shows. */
export type DepositView =
  /** Nothing to send: no address yet, or past the deposit. */
  | { kind: 'hidden' }
  /** Send to the address; `msLeft` until its deadline, when known. */
  | { kind: 'waiting'; msLeft?: number }
  /** The deadline passed with nothing received. */
  | { kind: 'expired' };

/** Statuses once the service has seen the deposit. */
const RECEIVED: ReadonlySet<ExecutionStatus> = new Set([
  'DEPOSIT_PROCESSING',
  'OPERATION_PENDING',
  'OPERATION_PROCESSING',
  'OPERATION_FAILED',
  'SUCCESS',
]);

/**
 * The deposit panel's state for a transfer run.
 * - A deposit the service has seen hides it, even after the deadline: a
 *   late deposit revives an expired run.
 * - `EXPIRED` shows as expired in any phase, including after the SDK gave
 *   up polling, so "Still processing" never replaces it.
 * - Otherwise the address shows while the run awaits its deposit, until the
 *   deadline.
 */
export const depositView = ({
  phase,
  status,
  depositAddress,
  deadline,
  now,
}: {
  phase: Phase;
  status?: ExecutionStatus;
  depositAddress?: string;
  deadline?: string;
  now: number;
}): DepositView => {
  if (status && RECEIVED.has(status)) {
    return { kind: 'hidden' };
  }

  if (status === 'EXPIRED' || phase === 'expired') {
    return { kind: 'expired' };
  }

  if (!depositAddress || phase !== 'awaiting-deposit') {
    return { kind: 'hidden' };
  }

  const end = deadline ? Date.parse(deadline) : Number.NaN;

  if (!Number.isFinite(end)) {
    return { kind: 'waiting' };
  }

  return now >= end
    ? { kind: 'expired' }
    : { kind: 'waiting', msLeft: end - now };
};

/** "28:45": what's left of a deposit window, for the title that counts down. */
export const countdown = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
