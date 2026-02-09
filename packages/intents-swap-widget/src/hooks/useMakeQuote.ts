import { useMemo, useRef } from 'react';
import { snakeCase } from 'change-case';
import {
  Quote as OneClickQuote,
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { AxiosError, AxiosResponse, CanceledError } from 'axios';

import { Quote } from '../types';
import { useIntentsAccountType } from './useIntentsAccountType';
import { useSupportedChains } from './useSupportedChains';
import { logger } from '@/logger';
import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { oneClickApi } from '@/network';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { isDryQuote } from '@/machine/guards/checks/isDryQuote';
import { getDryQuoteAddress } from '@/utils/getDryQuoteAddress';

type MakeArgs = {
  message?: string;
  quoteType?: 'exact_in' | 'exact_out';
  options?: {
    isRefetch?: boolean;
  };
};

const validateQuoteProperties = (
  quote: OneClickQuote,
): quote is OneClickQuote & {
  depositAddress: string;
} => {
  ['depositAddress'].forEach((property) => {
    if (!(property in quote)) {
      logger.error(`Missing ${property} in quote response`);

      return false;
    }
  });

  return true;
};

export const useMakeQuote = () => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useIntentsAccountType();
  const { supportedChains } = useSupportedChains();
  const { appName, apiKey, appFees, fetchQuote, slippageTolerance } =
    useConfig();

  const isDry = isDryQuote(ctx);

  const request = useRef<Promise<OneClickQuote>>(null);
  const abortController = useRef<AbortController>(new AbortController());

  const requestQuote = useMemo(() => {
    return async (
      data: QuoteRequest,
      metadata: { isRefetch?: boolean },
    ): Promise<OneClickQuote> => {
      const { signal } = abortController.current;

      if (fetchQuote) {
        return fetchQuote(data, {
          ...metadata,
          signal,
        });
      }

      return (
        await oneClickApi.post<QuoteResponse, AxiosResponse<QuoteResponse>>(
          // no need for extra check API will return missing API key error
          `https://intents-api.aurora.dev/api/quote/${apiKey ?? ''}`,
          data,
          { signal },
        )
      ).data.quote;
    };
  }, [apiKey, oneClickApi]);

  const make = async ({
    message,
    quoteType = 'exact_in',
    options = {},
  }: MakeArgs = {}): Promise<Quote | undefined> => {
    if (!fetchQuote && !apiKey) {
      logger.error('[WIDGET] Application key is required to make a quote');
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: { isDry, message: 'API key is required' },
      });
    }

    const guardCurrentState = guardStates(ctx, [
      'input_valid_dry',
      'input_valid_external',
      'input_valid_internal',
      'quote_success_internal',
      'quote_success_external',
    ]);

    if (!guardCurrentState) {
      const msg = `Unable to run quote in current state ${ctx.state}`;

      logger.error(`[WIDGET] ${msg}`);
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: { isDry, message: msg },
      });
    }

    const recipientIntentsAccountId = isDry
      ? getIntentsAccountId({
          addressType: intentsAccountType ?? 'evm',
          // address on the target chain should be a dry quote recipient
          walletAddress: getDryQuoteAddress(ctx.targetToken.blockchain),
        })
      : getIntentsAccountId({
          addressType: intentsAccountType,
          walletAddress: ctx.walletAddress ?? '',
        });

    const isRefundToIntentAccount =
      recipientIntentsAccountId &&
      (ctx.sourceToken.isIntent ||
        !supportedChains.includes(ctx.sourceToken.blockchain));

    const getRefundToAccountId = () => {
      if (isDry) {
        return getDryQuoteAddress(
          ctx.sourceToken.blockchain,
          ctx.sourceToken.isIntent,
        );
      }

      if (isRefundToIntentAccount) {
        return recipientIntentsAccountId;
      }

      return ctx.walletAddress ?? '';
    };

    if (!recipientIntentsAccountId) {
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

    let quoteResponse: OneClickQuote;

    const commonQuoteParams: Omit<
      QuoteRequest,
      'recipient' | 'recipientType' | 'depositType' | 'refundTo' | 'refundType'
    > = {
      // Settings
      dry: isDry,
      slippageTolerance,
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      swapType:
        quoteType === 'exact_out'
          ? QuoteRequest.swapType.EXACT_OUTPUT
          : QuoteRequest.swapType.EXACT_INPUT,

      // Target
      destinationAsset:
        ctx.targetToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
          ? WNEAR_ASSET_ID
          : ctx.targetToken.assetId,

      // Source
      originAsset:
        ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
          ? WNEAR_ASSET_ID
          : ctx.sourceToken.assetId,

      amount:
        quoteType === 'exact_out'
          ? ctx.targetTokenAmount
          : ctx.sourceTokenAmount,

      // Experimental
      quoteWaitingTimeMs: 0,
    };

    if (message) {
      // @ts-expect-error customRecipientMsg is not in the types
      commonQuoteParams.customRecipientMsg = message;
    }

    if (appName) {
      commonQuoteParams.referral = snakeCase(appName);
    }

    if (appFees) {
      commonQuoteParams.appFees = [...appFees];
    }

    try {
      if (ctx.sourceToken.isIntent && ctx.targetToken.isIntent) {
        request.current = requestQuote(
          {
            ...commonQuoteParams,
            recipient: recipientIntentsAccountId,
            recipientType: QuoteRequest.recipientType.INTENTS,
            depositType: QuoteRequest.depositType.INTENTS,

            // Refund
            refundTo: recipientIntentsAccountId,
            refundType: QuoteRequest.refundType.INTENTS,
          },
          options,
        );

        quoteResponse = await request.current;
      }

      request.current = requestQuote(
        {
          ...commonQuoteParams,
          recipient:
            !ctx.targetToken.isIntent && ctx.sendAddress
              ? ctx.sendAddress
              : recipientIntentsAccountId,
          recipientType: ctx.targetToken.isIntent
            ? QuoteRequest.recipientType.INTENTS
            : QuoteRequest.recipientType.DESTINATION_CHAIN,
          depositType: ctx.sourceToken.isIntent
            ? QuoteRequest.depositType.INTENTS
            : QuoteRequest.depositType.ORIGIN_CHAIN,

          // Refund
          refundTo: getRefundToAccountId(),
          refundType: isRefundToIntentAccount
            ? QuoteRequest.refundType.INTENTS
            : QuoteRequest.refundType.ORIGIN_CHAIN,
        },
        options,
      );

      quoteResponse = await request.current;
    } catch (error: unknown) {
      if (error instanceof CanceledError) {
        return;
      }

      logger.error('Quote error: ', error);
      let errorMessage = error instanceof Error ? error.message : '';

      if (error instanceof AxiosError) {
        errorMessage = error.response?.data.message || errorMessage;

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
          message: errorMessage || 'Failed to fetch quote. Please try again.',
        },
      });
    }

    if (isDry) {
      return {
        dry: true,
        ...quoteResponse,
        deadline: undefined,
        depositAddress: undefined,
      };
    }

    if (!validateQuoteProperties(quoteResponse)) {
      throw new QuoteError({
        code: 'QUOTE_INVALID',
        meta: { isDry: false },
      });
    }

    return {
      dry: false,
      ...quoteResponse,
      deadline: quoteResponse.deadline,
      depositAddress: quoteResponse.depositAddress,
    };
  };

  return {
    make,
    cancel: () => {
      abortController.current.abort('Abort quote manually');
      abortController.current = new AbortController();
    },
  };
};
