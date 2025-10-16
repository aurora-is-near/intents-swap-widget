import { useMakeNEARFtTransferCall } from './useMakeNEARFtTransferCall';
import { useAuroraExitToNear } from './useAuroraExitToNear';

import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';

import { useMakeQuoteTransfer } from '@/hooks/useMakeQuoteTransfer';
import { useMakeIntentsTransfer } from '@/hooks/useMakeIntentsTransfer';
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';

import { isAuroraChain } from '@/utils/aurora';

export const useMakeTransfer = ({
  providers,
  makeTransfer,
}: QuoteTransferArgs & IntentsTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();
  const {
    isNearToIntentsSameAssetTransfer,
    isParticipateWidget,
    isDirectNearDeposit,
  } = useComputedSnapshot();

  const { make: makeIntentsTransfer } = useMakeIntentsTransfer({ providers });
  const { make: makeQuoteTransfer } = useMakeQuoteTransfer({ makeTransfer });
  const { make: makeNEARFtTransferCall } = useMakeNEARFtTransferCall(
    providers?.near,
  );

  const { executeExitToNear } = useAuroraExitToNear({
    provider: providers?.evm,
  });

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
        // Handle Aurora Out of VC transfers
        if (
          ctx.sourceToken &&
          isAuroraChain(ctx.sourceToken.blockchain) &&
          ctx.targetToken.blockchain === 'near'
        ) {
          const recipientAddress = ctx.sendAddress || ctx.walletAddress;

          if (!recipientAddress) {
            throw new TransferError({
              code: 'TRANSFER_INVALID_INITIAL',
              meta: { message: 'No recipient address for Aurora exit.' },
            });
          }

          const txHash = await executeExitToNear({
            receiver: recipientAddress,
            amount: ctx.sourceTokenAmount,
            tokenAddress:
              ctx.sourceToken.contractAddress === 'native'
                ? undefined
                : ctx.sourceToken.contractAddress,
          });

          transferResult = {
            hash: txHash,
            transactionLink: `https://aurorascan.dev/tx/${txHash}`,
            intent: undefined,
          };
        } else if (isNearToIntentsSameAssetTransfer) {
          transferResult = await makeNEARFtTransferCall('intents.near');
        } else if (isParticipateWidget && isDirectNearDeposit) {
          if (!ctx.sendAddress) {
            throw new TransferError({
              code: 'TRANSFER_INVALID_INITIAL',
              meta: { message: 'No recipient address to transfer.' },
            });
          }

          transferResult = await makeNEARFtTransferCall(ctx.sendAddress);
        } else {
          transferResult = await makeQuoteTransfer();
        }
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
