import type { ExecutionStatus, Phase } from '@aurora-is-near/intents-connect';

/** Shown instead of the phase while a `delete_execution` prompt is open. */
export const CANCELLING_COPY = 'Sign to cancel';

export const CANCEL_COPY = 'Cancel';
export const RETRY_DEPOSIT_COPY = 'Retry deposit';
export const RESUME_DEPOSIT_COPY = 'Resume deposit';
export const DEPOSIT_INTO = 'Deposit into cbETH/WETH';

export const DEPOSIT_VIA_WALLET_COPY = 'Send from connected wallet';
export const DEPOSIT_VIA_WALLET_HINT =
  'The wallet is prompted to transfer the funds';
export const DEPOSIT_EXTERNAL_HINT =
  'You send the funds yourself — a deposit address is shown after signing';

export const PHASE_COPIES: Record<Phase, string> = {
  idle: 'Starting...',
  'resolving-identity': 'Resolving identity...',
  planning: 'Planning...',
  creating: 'Creating...',
  'awaiting-signature': 'Awaiting signature',
  submitting: 'Submitting...',
  'awaiting-deposit': 'Awaiting deposit',
  settling: 'Settling...',
  success: 'Success',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const STATUS_COPIES: Record<ExecutionStatus, string> = {
  CREATED: 'Execution created',
  DEPOSIT_PENDING: 'Pending deposit...',
  DEPOSIT_PROCESSING: 'Processing deposit...',
  OPERATION_PENDING: 'Pending operation...',
  OPERATION_PROCESSING: 'Processing operation...',
  SUCCESS: 'Execution succeeded!',
  DEPOSIT_FAILED: 'Deposit failed',
  OPERATION_FAILED: 'Operation failed',
  EXPIRED: 'Execution expired',
};
