import type { ExecutionStatus } from '@aurora-is-near/intents-connect';

export const STATUS_COPIES: Record<ExecutionStatus, string> = {
  CREATED: 'Execution created',
  DEPOSIT_PENDING: 'Waiting for your deposit...',
  DEPOSIT_PROCESSING: 'Processing deposit...',
  OPERATION_PENDING: 'Bridging to Polygon...',
  OPERATION_PROCESSING: 'Swapping to pUSD...',
  SUCCESS: 'Deposited to Polymarket',
  DEPOSIT_FAILED: 'Deposit failed',
  OPERATION_FAILED: 'Operation failed',
  EXPIRED: 'Execution expired',
};
