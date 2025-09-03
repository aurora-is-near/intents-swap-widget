import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';

import { useMakeQuoteTransfer } from '@/hooks/useMakeQuoteTransfer';
import { useMakeIntentsTransfer } from '@/hooks/useMakeIntentsTransfer';
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';
import { useMakeNEARFtTransferCall } from './useMakeNEARFtTransferCall';
import { useComputedSnapshot } from '@/machine/snap';

export const useMakeTransfer = ({
  providers,
  makeTransfer,
}: QuoteTransferArgs & IntentsTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();
  const { isNearToIntentsSameAssetTransfer } = useComputedSnapshot();
  const { make: makeIntentsTransfer } = useMakeIntentsTransfer({ providers });
  const { make: makeQuoteTransfer } = useMakeQuoteTransfer({ makeTransfer });
  const { make: makeNEARFtTransferCall } = useMakeNEARFtTransferCall(providers?.near);
  
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
        if (isNearToIntentsSameAssetTransfer) {
          transferResult = await makeNEARFtTransferCall()
        }
          transferResult = await makeQuoteTransfer();
      } else {
        transferResult = await makeIntentsTransfer({
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
