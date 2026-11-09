import type { Phase } from '@aurora-is-near/intents-connect';
import type { FundedFlowStage } from '@aurora-is-near/intents-connect/react';

/**
 * Where the user's supply is, for the dApp to show outside the modal (its
 * own button, a badge): it keeps changing while the modal is closed.
 * `label` is short enough for a button.
 */
export type SupplyStatus =
  | { state: 'idle' }
  /** The wallet or the user has to act: sign, confirm, resume. */
  | { state: 'action'; label: string }
  /** Working on its own: bridging, supplying. */
  | { state: 'running'; label: string }
  | { state: 'success'; label: string }
  | { state: 'failed'; label: string };

export const IDLE: SupplyStatus = { state: 'idle' };

/** What the modal is following: a supply, or funds a failed one left. */
export type StatusInput =
  | { kind: 'none' }
  | {
      kind: 'run';
      phase: Phase;
      /** Found in flight, waiting for the user to resume it. */
      waiting: boolean;
      /** The deposit transfer failed and can be retried. */
      transferFailed: boolean;
      /** The user sends the deposit themselves. */
      externalDeposit: boolean;
      /** A transfer's time to send ran out (a late deposit still counts). */
      depositExpired?: boolean;
    }
  | {
      kind: 'recovery';
      phase: Phase;
      state: 'idle' | 'running' | 'success' | 'failed';
    }
  | {
      /** Paid from intents balances: moved first, then supplied. */
      kind: 'funded';
      stage: FundedFlowStage;
      /** The runner's phase, while it supplies. */
      phase: Phase;
    };

const SUPPLYING: SupplyStatus = { state: 'running', label: 'Supplying…' };
const SIGN: SupplyStatus = { state: 'action', label: 'Sign in your wallet' };
const SUCCESS: SupplyStatus = { state: 'success', label: 'Supplied' };
const FAILED: SupplyStatus = { state: 'failed', label: 'Supply failed' };

/** The status of what the modal follows. */
export const supplyStatus = (input: StatusInput): SupplyStatus => {
  if (input.kind === 'none') {
    return IDLE;
  }

  if (input.kind === 'recovery') {
    switch (input.state) {
      case 'idle':
        return IDLE;
      case 'success':
        return SUCCESS;
      case 'failed':
        return FAILED;
      default:
        return input.phase === 'awaiting-signature' ? SIGN : SUPPLYING;
    }
  }

  if (input.kind === 'funded') {
    switch (input.stage) {
      case 'idle':
        return IDLE;
      case 'ready-to-transfer':
        return { state: 'action', label: 'Sign the move' };
      case 'awaiting-transfer-signature':
        return SIGN;
      case 'quoting':
      case 'submitting-transfer':
      case 'bridging':
      case 'awaiting-arrival':
        return { state: 'running', label: 'Moving funds…' };
      case 'ready-to-supply':
        return input.phase === 'awaiting-signature'
          ? SIGN
          : { state: 'action', label: 'Finish your supply' };
      case 'supplying':
        return input.phase === 'awaiting-signature' ? SIGN : SUPPLYING;
      case 'success':
        return SUCCESS;
      case 'refunded':
        return { state: 'failed', label: 'Refunded' };
      default:
        return FAILED;
    }
  }

  if (input.waiting) {
    return { state: 'action', label: 'Resume your supply' };
  }

  if (input.transferFailed) {
    return { state: 'action', label: 'Retry the transfer' };
  }

  if (input.depositExpired) {
    return { state: 'action', label: 'Time to send ran out' };
  }

  switch (input.phase) {
    case 'success':
      return SUCCESS;
    case 'failed':
      return FAILED;
    case 'cancelled':
      return IDLE;
    case 'awaiting-signature':
      return SIGN;
    case 'awaiting-deposit':
    case 'expired':
      return input.externalDeposit
        ? { state: 'action', label: 'Send the deposit' }
        : { state: 'action', label: 'Confirm in your wallet' };
    default:
      return SUPPLYING;
  }
};

/** One status per change, compared by value. */
export const sameStatus = (a: SupplyStatus, b: SupplyStatus) =>
  a.state === b.state &&
  ('label' in a ? a.label : '') === ('label' in b ? b.label : '');
