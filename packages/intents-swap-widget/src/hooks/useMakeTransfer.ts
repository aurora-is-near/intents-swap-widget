import { useQueryClient } from '@tanstack/react-query';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { MakeTransfer, TransferResult } from '@/types/transfer';

import { INTENTS_CONTRACT } from '@/constants';
import { INTENT_DEPOSIT_TOKENS_MAP } from '@/machine/effects/useSetTokenIntentsTargetEffect';
import { useMakeQuoteTransfer } from '@/hooks/useMakeQuoteTransfer';
import { useMakeIntentsTransfer } from '@/hooks/useMakeIntentsTransfer';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useBalancesUpdate } from '@/context/BalancesUpdateContext';
import { useMergedBalance } from '@/hooks/useMergedBalance';
import { getDepositType } from '@/utils/intents/getDepositType';
import { getQuoteRecipient } from '@/utils/intents/getQuoteRecipient';
import { getQuoteRefundTo } from '@/utils/intents/getQuoteRefundTo';
import { getQuoteRefundType } from '@/utils/intents/getQuoteRefundType';
import { getTransactionHistoryQueryKey } from '../utils/transactions/getTransactionHistoryQueryKey';
import { addOptimisticTransaction } from '../utils/transactions/addOptimisticTransaction';
import { Plugins, Providers } from '../types';
import { useIntentsAccountType } from './useIntentsAccountType';
import { useMakeNEARFtTransferCall } from './useMakeNEARFtTransferCall';
import { useSupportedChains } from './useSupportedChains';

export const useMakeTransfer = ({
  message,
  providers,
  plugins,
  makeTransfer,
}: {
  message?: string;
  providers?: Providers;
  plugins?: Plugins;
  makeTransfer?: MakeTransfer;
}) => {
  const { ctx } = useUnsafeSnapshot();
  const {
    isDirectTokenOnNearDeposit,
    isDirectTokenOnNearTransfer,
    isNativeNearDeposit,
  } = useComputedSnapshot();

  const { make: makeIntentsTransfer } = useMakeIntentsTransfer({
    providers,
    plugins,
  });

  const { make: makeQuoteTransfer } = useMakeQuoteTransfer({
    makeTransfer,
    providers,
    plugins,
  });

  const { make: makeNEARFtTransferCall } = useMakeNEARFtTransferCall(
    providers?.near,
  );

  const queryClient = useQueryClient();
  const { mergedBalance } = useMergedBalance();
  const { addPendingTokens } = useBalancesUpdate();
  const { intentsAccountType } = useIntentsAccountType();
  const { supportedChains } = useSupportedChains();

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
      logger.error(error instanceof TransferError ? error.data : error);

      fireEvent('transferSetStatus', { status: 'error' });
      fireEvent(
        'errorSet',
        error instanceof TransferError
          ? error.data
          : { code: 'DIRECT_TRANSFER_ERROR' },
      );

      return;
    }

    if (!transferResult) {
      fireEvent('transferSetStatus', { status: 'idle' });

      return;
    }

    fireEvent('transferSetStatus', { status: 'success' });

    if (ctx.sourceToken && ctx.targetToken) {
      const sourceKey = getTokenBalanceKey({
        ...ctx.sourceToken,
        assetId: ctx.sourceToken.isIntent
          ? (INTENT_DEPOSIT_TOKENS_MAP[ctx.sourceToken.assetId] ??
            ctx.sourceToken.assetId)
          : ctx.sourceToken.assetId,
      });

      const targetKey = getTokenBalanceKey({
        ...ctx.targetToken,
        assetId: ctx.targetToken.isIntent
          ? (INTENT_DEPOSIT_TOKENS_MAP[ctx.targetToken.assetId] ??
            ctx.targetToken.assetId)
          : ctx.targetToken.assetId,
      });

      if (!ctx.sendAddress || ctx.sendAddress === ctx.walletAddress) {
        addPendingTokens([
          { balanceKey: targetKey, priorBalance: mergedBalance[targetKey] },
        ]);
      }

      if (!ctx.isDepositFromExternalWallet) {
        addPendingTokens([
          { balanceKey: sourceKey, priorBalance: mergedBalance[sourceKey] },
        ]);
      }
    }

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

      // If the transfer is a 1Click deposit we insert an optimistic
      // transaction here for faster feedback. That transaction will be replaced
      // by the real one once the polling of the Explorer API picks it up. For
      // non-1Click transfers (e.g. direct NEAR transfers) that transaction will
      // never be resolved, so we do not optimistically add it to the history.
      if (transferResult.isOneClickDeposit) {
        // Mirror the recipient/refundTo the quote sent to 1Click so the
        // optimistic record matches what the Explorer API will eventually
        // echo back. The wallet always appears in `senders` so the
        // optimistic survives the wallet filter regardless of where it ends
        // up in recipient/refundTo (e.g. 'aurora' for Aurora destinations).
        const recipient = getQuoteRecipient({
          walletAddress: ctx.walletAddress,
          sendAddress: ctx.sendAddress,
          targetToken: ctx.targetToken,
          intentsAccountType,
          defaultRecipient: ctx.walletAddress,
        });

        const refundTo = getQuoteRefundTo({
          walletAddress: ctx.walletAddress,
          sourceToken: ctx.sourceToken,
          targetToken: ctx.targetToken,
          intentsAccountType,
          supportedChains,
          defaultRefundTo: ctx.walletAddress,
        });

        const refundType = getQuoteRefundType({
          walletAddress: ctx.walletAddress,
          sourceToken: ctx.sourceToken,
          targetToken: ctx.targetToken,
          intentsAccountType,
          supportedChains,
        });

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
          recipient,
          refundTo,
          refundType,
          originChainTxHashes: [transferResult.hash],
          intentHashes: transferResult.intent,
          depositAddress: ctx.quote.depositAddress,
          depositType: getDepositType(ctx.sourceToken),
          recipientType: ctx.targetToken.isIntent
            ? 'INTENTS'
            : 'DESTINATION_CHAIN',
        });
      }
    }

    void queryClient.invalidateQueries({
      queryKey: getTransactionHistoryQueryKey(),
    });

    return transferResult;
  };

  return { make };
};
