import { useRef } from 'react';
import {
  ApiError,
  CancelablePromise,
  CancelError,
  OneClickService,
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { DRY_QUOTE_ADDRESSES } from '@/constants/chains';
import { Quote } from '@/types/quote';

import { useTokens } from './useTokens';

type Props = {
  variant: 'deposit' | 'swap';
};

export const useMakeQuote = ({ variant }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useConfig();

  const isDry = !ctx.walletAddress;

  const { tokens: tokenList } = useTokens();
  const intentsAccountId = getIntentsAccountId({
    addressType: intentsAccountType,
    walletAddress: isDry
      ? DRY_QUOTE_ADDRESSES[intentsAccountType]
      : (ctx.walletAddress ?? ''),
  });

  const request = useRef<CancelablePromise<QuoteResponse>>(null);

  const targetWalletAddress = isDry
    ? DRY_QUOTE_ADDRESSES[intentsAccountType]
    : (ctx.walletAddress ?? '');

  const make = async ({ message }: { message?: string } = {}) => {
    const guardCurrentState = guardStates(ctx, [
      'input_valid_dry',
      'input_valid_external',
      'input_valid_internal',
    ]);

    if (!guardCurrentState) {
      const msg = `Unable to run quote in current state ${ctx.state}`;

      logger.error(`[WIDGET] ${msg}`);

      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: { isDry, message: msg },
      });
    }

    if (!intentsAccountId) {
      const msg = 'No corresponding intents account to run a quote';

      logger.error(`[WIDGET] ${msg}`);

      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: { isDry, message: msg },
      });
    }

    if (request.current && !request.current.isCancelled) {
      request.current.cancel();
    }

    let quoteResponse: QuoteResponse;

    try {
      const commonQuoteParams = {
        // Settings
        slippageTolerance: 100, // 1%
        swapType: QuoteRequest.swapType.EXACT_INPUT,
        deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        dry: isDry,

        // Source
        originAsset: ctx.sourceToken.assetId,
        amount: ctx.sourceTokenAmount,
      };

      if (message) {
        // @ts-expect-error customRecipientMsg is not in the types
        commonQuoteParams.customRecipientMsg = message;
      }

      try {
        switch (variant) {
          case 'deposit': {
            const destinationAsset = tokenList.find(
              (t) =>
                t.blockchain === 'near' && t.symbol === ctx.sourceToken.symbol,
            );

            if (!destinationAsset) {
              throw new QuoteError({
                code: 'NO_NEAR_TOKEN_FOUND',
                meta: { symbol: ctx.sourceToken.symbol },
              });
            }

            request.current = OneClickService.getQuote({
              ...commonQuoteParams,
              recipient: intentsAccountId,
              recipientType: QuoteRequest.recipientType.INTENTS,
              depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
              destinationAsset: destinationAsset.assetId,

              // Refund
              refundTo: targetWalletAddress,
              refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
            });

            quoteResponse = await request.current;
            break;
          }

          case 'swap': {
            if (ctx.sourceToken.isIntent && ctx.targetToken.isIntent) {
              request.current = OneClickService.getQuote({
                ...commonQuoteParams,
                recipient: intentsAccountId,
                recipientType: QuoteRequest.recipientType.INTENTS,
                destinationAsset: ctx.targetToken.assetId,
                depositType: QuoteRequest.depositType.INTENTS,

                // Refund
                refundTo: intentsAccountId,
                refundType: QuoteRequest.refundType.INTENTS,
              });

              quoteResponse = await request.current;
              break;
            }

            request.current = OneClickService.getQuote({
              ...commonQuoteParams,
              recipient:
                !ctx.targetToken.isIntent && ctx.sendAddress
                  ? ctx.sendAddress
                  : intentsAccountId,
              recipientType: ctx.targetToken.isIntent
                ? QuoteRequest.recipientType.INTENTS
                : QuoteRequest.recipientType.DESTINATION_CHAIN,
              destinationAsset: ctx.targetToken.assetId,
              depositType: ctx.sourceToken.isIntent
                ? QuoteRequest.depositType.INTENTS
                : QuoteRequest.depositType.ORIGIN_CHAIN,

              // Refund
              refundTo: ctx.sourceToken.isIntent
                ? intentsAccountId
                : targetWalletAddress,
              refundType: ctx.sourceToken.isIntent
                ? QuoteRequest.refundType.INTENTS
                : QuoteRequest.refundType.ORIGIN_CHAIN,
            });

            quoteResponse = await request.current;
            break;
          }

          default: {
            const msg = 'Unknown swap variant (deposit or swap expected)';

            logger.error(`[WIDGET] ${msg}`);

            throw new QuoteError({
              code: 'QUOTE_INVALID_INITIAL',
              meta: { isDry, message: msg },
            });
          }
        }
      } catch (error: unknown) {
        if (error instanceof CancelError) {
          return;
        }

        if (error instanceof ApiError) {
          logger.error(error);
          throw error;
        }

        logger.error('[WIDGET] Failed to get a deposit address from the quote');

        throw new QuoteError({
          code: 'QUOTE_INVALID',
          meta: { isDry },
        });
      }

      if (
        !quoteResponse.quote.depositAddress &&
        !request.current.isCancelled &&
        !isDry
      ) {
        throw new Error('Failed to get a deposit address from the quote');
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const errorMessage = error.body.message ?? error.message;

        if (errorMessage.includes('Amount is too low')) {
          const match = errorMessage.match(/\d+/);
          const minAmount = match ? match[0] : undefined;

          throw new QuoteError({
            code: 'QUOTE_AMOUNT_IS_TOO_LOW',
            meta: {
              minAmount:
                (minAmount &&
                  formatBigToHuman(minAmount, ctx.sourceToken.decimals)) ??
                '0',
            },
          });
        }

        if (errorMessage.includes('recipient is not valid')) {
          throw new QuoteError({
            code: 'TOKEN_IS_NOT_SUPPORTED',
          });
        }

        if (errorMessage.includes('Failed to get a deposit address')) {
          throw new QuoteError({
            code: 'QUOTE_NO_ONE_TIME_ADDRESS',
          });
        }

        throw error;
      }

      throw new QuoteError({
        code: 'QUOTE_FAILED',
        meta: {
          // @ts-expect-error In case error has a message
          message: error?.message ?? 'Failed to fetch quote. Please try again.',
        },
      });
    }

    let result: Quote;

    if (isDry) {
      result = {
        dry: true,
        ...quoteResponse.quote,
        deadline: undefined,
        depositAddress: undefined,
      };
    } else if (
      quoteResponse.quote.deadline &&
      quoteResponse.quote.depositAddress
    ) {
      result = {
        dry: false,
        ...quoteResponse.quote,
        deadline: quoteResponse.quote.deadline,
        depositAddress: quoteResponse.quote.depositAddress,
      };
    } else {
      throw new QuoteError({
        code: 'QUOTE_INVALID',
        meta: { isDry },
      });
    }

    return result;
  };

  return { make, cancel: () => request.current?.cancel() };
};
