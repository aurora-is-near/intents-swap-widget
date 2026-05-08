import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { useOneClickExecutionStatus } from '@/hooks';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { TransactionStatus } from '@/types/transaction';
import type { TransferResult } from '@/types/transfer';

const mapOneClickStatus = (
  status: GetExecutionStatusResponse.status,
): TransactionStatus => {
  switch (status) {
    case GetExecutionStatusResponse.status.SUCCESS:
      return 'SUCCESS';
    case GetExecutionStatusResponse.status.FAILED:
      return 'FAILED';
    case GetExecutionStatusResponse.status.REFUNDED:
      return 'REFUNDED';
    case GetExecutionStatusResponse.status.PROCESSING:
    case GetExecutionStatusResponse.status.KNOWN_DEPOSIT_TX:
      return 'PROCESSING';
    case GetExecutionStatusResponse.status.PENDING_DEPOSIT:
      return 'PENDING';
    case GetExecutionStatusResponse.status.INCOMPLETE_DEPOSIT:
      return 'WAITING_FOR_FUNDS';
    default:
      return 'PENDING';
  }
};

export const useTransferResultStatus = (
  transferResult: Pick<TransferResult, 'isOneClickDeposit'>,
  options?: { disabled?: boolean },
): TransactionStatus => {
  const { ctx } = useUnsafeSnapshot();
  const { isOneClickDeposit } = transferResult;
  const isValidTransaction = isOneClickDeposit && ctx.quote && !ctx.quote.dry;

  const depositAddress = isValidTransaction
    ? ctx.quote.depositAddress
    : undefined;

  const depositMemo = isValidTransaction ? ctx.quote.depositMemo : undefined;

  const { data: oneClickExecution } = useOneClickExecutionStatus({
    depositAddress,
    depositMemo,
    disabled: options?.disabled,
  });

  // Handle flows that don't go through 1Click in the normal way
  // (such as NEAR FT transfer calls) by considering the transfer a success.
  if (!isOneClickDeposit) {
    return 'SUCCESS';
  }

  if (oneClickExecution) {
    return mapOneClickStatus(oneClickExecution.status);
  }

  return 'PENDING';
};
