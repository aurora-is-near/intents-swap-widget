import { useMemo, useRef } from 'react';
import {
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { AxiosError, AxiosResponse, CanceledError } from 'axios';

import { snakeCase } from 'change-case';
import { logger } from '@/logger';
import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { oneClickApi } from '@/network';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { DRY_QUOTE_ADDRESSES } from '@/constants/chains';
import type { Quote } from '@/types/quote';

import { useTokens } from './useTokens';

type Props = {
  variant: 'deposit' | 'swap';
};

type MakeArgs = {
  message?: string;
  quoteType?: 'exact_in' | 'exact_out';
};

export const useMakeQuote = ({ variant }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType, oneClickApiQuoteProxyUrl, appName } = useConfig();

  const isDry = !ctx.walletAddress;

  const { tokens: tokenList } = useTokens();
  const intentsAccountId = getIntentsAccountId({
    addressType: intentsAccountType,
    walletAddress: isDry
      ? DRY_QUOTE_ADDRESSES[intentsAccountType]
      : (ctx.walletAddress ?? ''),
  });

  const request = useRef<Promise<AxiosResponse<QuoteResponse>>>(null);
  const abortController = useRef<AbortController>(new AbortController());

  const requestQuote = useMemo(() => {
    return async (data: QuoteRequest) => {
      return oneClickApi.post<QuoteResponse, AxiosResponse<QuoteResponse>>(
        oneClickApiQuoteProxyUrl,
        data,
        {
          signal: abortController.current.signal,
        },
      );
    };
  }, [oneClickApiQuoteProxyUrl, oneClickApi]);

  const targetWalletAddress = isDry
    ? DRY_QUOTE_ADDRESSES[intentsAccountType]
    : (ctx.walletAddress ?? '');

  const make = async ({ message, quoteType = 'exact_in' }: MakeArgs = {}) => {
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

    if (request.current) {
      abortController.current.abort('Abort previous quote (auto)');
      abortController.current = new AbortController();
    }

    let quoteResponse: QuoteResponse;

    const commonQuoteParams = {
      // Settings
      dry: isDry,
      slippageTolerance: 100, // 1%
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      swapType:
        quoteType === 'exact_out'
          ? QuoteRequest.swapType.EXACT_OUTPUT
          : QuoteRequest.swapType.EXACT_INPUT,

      // Source
      originAsset: ctx.sourceToken.assetId,
      amount:
        quoteType === 'exact_out'
          ? ctx.targetTokenAmount
          : ctx.sourceTokenAmount,
    };

    if (message) {
      // @ts-expect-error customRecipientMsg is not in the types
      commonQuoteParams.customRecipientMsg = message;
    }

    if (appName) {
      // @ts-expect-error appName is not in the types
      commonQuoteParams.referral = snakeCase(appName);
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

          request.current = requestQuote({
            ...commonQuoteParams,
            recipient: intentsAccountId,
            recipientType: QuoteRequest.recipientType.INTENTS,
            depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
            destinationAsset: destinationAsset.assetId,

            // Refund
            refundTo: targetWalletAddress,
            refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
          });

          quoteResponse = (await request.current).data;
          break;
        }

        case 'swap': {
          if (ctx.sourceToken.isIntent && ctx.targetToken.isIntent) {
            request.current = requestQuote({
              ...commonQuoteParams,
              recipient: intentsAccountId,
              recipientType: QuoteRequest.recipientType.INTENTS,
              destinationAsset: ctx.targetToken.assetId,
              depositType: QuoteRequest.depositType.INTENTS,

              // Refund
              refundTo: intentsAccountId,
              refundType: QuoteRequest.refundType.INTENTS,
            });

            quoteResponse = (await request.current).data;
            break;
          }

          request.current = requestQuote({
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

          quoteResponse = (await request.current).data;
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
      if (error instanceof CanceledError) {
        return;
      }

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data.message || error.message;

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
          message: errorMessage ?? 'Failed to fetch quote. Please try again.',
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

  return {
    make,
    cancel: () => {
      abortController.current.abort('Abort quote manually');
      abortController.current = new AbortController();
    },
  };
};
