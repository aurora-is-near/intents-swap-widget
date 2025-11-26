import { useMakeNEARFtTransferCall } from './useMakeNEARFtTransferCall';
import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';

import { INTENTS_CONTRACT } from '@/constants';
import { useMakeQuoteTransfer } from '@/hooks/useMakeQuoteTransfer';
import { useMakeIntentsTransfer } from '@/hooks/useMakeIntentsTransfer';
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';

export const useMakeTransfer = ({
  message,
  providers,
  makeTransfer,
}: QuoteTransferArgs & IntentsTransferArgs & { message?: string }) => {
  const { ctx } = useUnsafeSnapshot();
  const {
    isDirectTokenOnNearDeposit,
    isDirectTokenOnNearTransfer,
    isNativeNearDeposit,
  } = useComputedSnapshot();

  const { make: makeIntentsTransfer } = useMakeIntentsTransfer({ providers });
  const { make: makeQuoteTransfer } = useMakeQuoteTransfer({
    makeTransfer,
    providers,
  });

  const { make: makeNEARFtTransferCall } = useMakeNEARFtTransferCall(
    providers?.near,
  );

  const make = async () => {
    if (!ctx.targetToken) {
      return;
    }

    let transferResult: TransferResult | undefined;

    try {
      fireEvent('transferSetStatus', {
        status: 'pending',
        reason: 'WAITING_CONFIRMATION',
      });

      if (!ctx.sourceToken?.isIntent) {
        if (
          (isNativeNearDeposit || isDirectTokenOnNearDeposit) &&
          !ctx.isDepositFromExternalWallet
        ) {
          // sendAddress can be used to deposit into another intents account here
          transferResult = await makeNEARFtTransferCall(
            ctx.sendAddress ?? INTENTS_CONTRACT,
            message,
          );
        } else if (isDirectTokenOnNearTransfer) {
          if (!ctx.sendAddress) {
            throw new TransferError({
              code: 'TRANSFER_INVALID_INITIAL',
              meta: { message: 'No recipient address to transfer' },
            });
          }

          transferResult = await makeNEARFtTransferCall(
            ctx.sendAddress,
            message,
          );
        } else {
          transferResult = await makeQuoteTransfer();
        }
      } else {
        transferResult = await makeIntentsTransfer({
          message,
          onPending: (reason) => {
            fireEvent('transferSetStatus', {
              status: 'pending',
              reason,
            });
          },
        });
      }
    } catch (error: unknown) {
      if (error instanceof TransferError) {
        logger.error(error.data);
        fireEvent('transferSetStatus', { status: 'error' });
        fireEvent('errorSet', error.data);
      }
    }

    if (!transferResult) {
      fireEvent('transferSetStatus', { status: 'idle' });

      return;
    }

    fireEvent('transferSetStatus', { status: 'success' });
    moveTo('transfer_success');

    return transferResult;
  };

  return { make };
};
