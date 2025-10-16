import axios from 'axios';

import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID } from '@/constants/tokens';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import type { TransferResult } from '@/types/transfer';

type Result = {
  hash: string;
  transactionLink: string;
  intent?: string;
};

export type QuoteTransferArgs = {
  makeTransfer: (args: {
    amount: string;
    address: string;
    tokenAddress: string | undefined;
  }) => Promise<Result | undefined | null>;
};

export const useMakeQuoteTransfer = ({ makeTransfer }: QuoteTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();

  const make = async (): Promise<TransferResult | undefined> => {
    if (!ctx.sourceToken) {
      const msg = 'No token selected to transfer.';

      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: msg },
      });
    }

    if (!ctx.quote) {
      const msg = 'Quote is required for a transfer.';

      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: msg },
      });
    }

    if (!ctx.quote.depositAddress) {
      const msg = 'Quote has no deposit address. Make sure not dry.';

      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: msg },
      });
    }

    try {
      const depositResult = await makeTransfer({
        amount: ctx.quote.amountIn,
        address: ctx.quote.depositAddress,
        tokenAddress:
          ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
            ? NATIVE_NEAR_DUMB_ASSET_ID
            : ctx.sourceToken.contractAddress,
      });

      if (!depositResult) {
        logger.error('[TRANSFER ERROR]', 'No deposit result');
        throw new TransferError({
          code: 'NO_DEPOSIT_RESULT',
        });
      }

      return {
        hash: depositResult.hash,
        transactionLink: depositResult.transactionLink,
        intent: undefined,
      };
    } catch (error: unknown) {
      logger.error('[TRANSFER ERROR]', error, { error });
      let errorMessage = 'Failed to make a transfer. Please try again.';

      const userCancelledTx =
        error instanceof Error && isUserDeniedSigning(error.message);

      if (userCancelledTx) {
        return;
      }

      if (axios.isAxiosError<{ detail?: string }>(error)) {
        errorMessage =
          error.response?.data?.detail ??
          error.message ??
          'Failed to make deposit. Please try again.';

        throw new TransferError({
          code: 'QUOTE_ERROR',
          meta: { message: errorMessage },
        });
      } else if (errorMessage === 'No quotes found') {
        throw new TransferError({
          code: 'NO_QUOTE_FOUND',
        });
      } else if (error instanceof Error) {
        if (!userCancelledTx) {
          throw new TransferError({
            code: 'QUOTE_ERROR',
            meta: { message: error.message },
          });
        }
      }

      throw new TransferError({
        code: 'QUOTE_ERROR',
        meta: { message: 'Unknown quote transfer error' },
      });
    }
  };

  return { make };
};
