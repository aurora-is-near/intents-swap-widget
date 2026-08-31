import type { ExecutionStatus, Phase } from '@aurora-is-near/intents-connect';

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
