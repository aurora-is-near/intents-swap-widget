import { useQueryClient } from '@tanstack/react-query';
import { useMakeNEARFtTransferCall } from './useMakeNEARFtTransferCall';
import { Providers } from '../types';
import { addOptimisticTransaction } from '../utils/transactions/addOptimisticTransaction';
import { getTransactionHistoryQueryKey } from '../utils/transactions/getTransactionHistoryQueryKey';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { MakeTransfer, TransferResult } from '@/types/transfer';

import { INTENTS_CONTRACT } from '@/constants';
import { useMakeQuoteTransfer } from '@/hooks/useMakeQuoteTransfer';
import { useMakeIntentsTransfer } from '@/hooks/useMakeIntentsTransfer';

export const useMakeTransfer = ({
  message,
  providers,
  makeTransfer,
}: {
  message?: string;
  providers?: Providers;
  makeTransfer?: MakeTransfer;
}) => {
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

  const queryClient = useQueryClient();

  const make = async () => {
    if (!ctx.targetToken) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No target token selected' },
      });
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

        return;
      }

      throw error;
    }

    if (!transferResult) {
      fireEvent('transferSetStatus', { status: 'idle' });

      return;
    }

    fireEvent('transferSetStatus', { status: 'success' });
    moveTo('transfer_success');

    // Add optimistic transaction so it appears immediately in the history.
    // It gets naturally replaced once polling picks up the real transaction.
    if (
      ctx.walletAddress &&
      ctx.sourceToken &&
      ctx.targetToken &&
      ctx.quote &&
      'amountInUsd' in ctx.quote &&
      ctx.quote.amountInUsd
    ) {
      const optimisticKey = transferResult.intent ?? transferResult.hash;

      addOptimisticTransaction(optimisticKey, {
        status: 'PENDING',
        originAsset: ctx.sourceToken.assetId,
        destinationAsset: ctx.targetToken.assetId,
        amountInFormatted: formatBigToHuman(
          ctx.sourceTokenAmount,
          ctx.sourceToken.decimals,
        ),
        amountOutFormatted: formatBigToHuman(
          ctx.targetTokenAmount,
          ctx.targetToken.decimals,
        ),
        amountInUsd: ctx.quote.amountInUsd,
        amountOutUsd: ctx.quote.amountOutUsd,
        createdAt: new Date().toISOString(),
        senders: [ctx.walletAddress],
        recipient: ctx.sendAddress ?? '',
        originChainTxHashes: [transferResult.hash],
        intentHashes: transferResult.intent,
      });
    }

    void queryClient.invalidateQueries({
      queryKey: getTransactionHistoryQueryKey(),
    });

    return transferResult;
  };

  return { make };
};
