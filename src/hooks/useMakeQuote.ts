import { useMemo, useRef } from 'react';
import { snakeCase } from 'change-case';
import {
  Quote as OneClickQuote,
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { AxiosError, AxiosResponse, CanceledError } from 'axios';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { oneClickApi } from '@/network';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { DRY_QUOTE_ADDRESSES } from '@/constants/chains';
import { getQuoteRegistry } from '@/utils/quotes/registry';
import type { QuoteBuilderContext } from '@/types/quoteBuilder';
import type { Quote } from '@/types/quote';

type MakeArgs = {
  message?: string;
  quoteType?: 'exact_in' | 'exact_out';
};

const validateQuoteProperty = (
  quote: OneClickQuote,
  property: keyof OneClickQuote,
) => {
  if (!(property in quote)) {
    logger.error(`Missing ${property} in quote response`);

    throw new QuoteError({
      code: 'QUOTE_INVALID',
      meta: { isDry: false },
    });
  }
};

export const useMakeQuote = () => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType, oneClickApiQuoteProxyUrl, appName, fetchQuote } =
    useConfig();

  const isDry = !ctx.walletAddress;
  const intentsAccountId = getIntentsAccountId({
    addressType: intentsAccountType,
    walletAddress: isDry
      ? DRY_QUOTE_ADDRESSES[intentsAccountType]
      : (ctx.walletAddress ?? ''),
  });

  const request = useRef<Promise<OneClickQuote>>(null);
  const abortController = useRef<AbortController>(new AbortController());

  const requestQuote = useMemo(() => {
    return async (data: QuoteRequest): Promise<OneClickQuote> => {
      if (fetchQuote) {
        return fetchQuote(data);
      }

      return (
        await oneClickApi.post<QuoteResponse, AxiosResponse<QuoteResponse>>(
          oneClickApiQuoteProxyUrl,
          data,
          {
            signal: abortController.current.signal,
          },
        )
      ).data.quote;
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

    let quoteResponse: OneClickQuote;

    // Build quote context for dynamic quote building
    const quoteContext: QuoteBuilderContext = {
      sourceToken: {
        ...ctx.sourceToken,
        assetId: ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
          ? WNEAR_ASSET_ID
          : ctx.sourceToken.assetId,
      },
      targetToken: {
        ...ctx.targetToken,
        assetId: ctx.targetToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
          ? WNEAR_ASSET_ID
          : ctx.targetToken.assetId,
      },
      sourceTokenAmount: ctx.sourceTokenAmount,
      targetTokenAmount: ctx.targetTokenAmount,
      intentsAccountId,
      targetWalletAddress,
      sendAddress: ctx.sendAddress,
      message,
      quoteType,
      isDry,
    };

    try {
      // Use dynamic quote building system
      const quoteRegistry = getQuoteRegistry();
      const quoteParams = quoteRegistry.buildQuoteParams(quoteContext);

      // Add global settings
      const finalQuoteParams = {
        ...quoteParams,
        dry: isDry,
        slippageTolerance: quoteParams.slippageTolerance ?? 100, // 1%
        deadline: quoteParams.deadline ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        swapType: quoteParams.swapType ?? (
          quoteType === 'exact_out'
            ? QuoteRequest.swapType.EXACT_OUTPUT
            : QuoteRequest.swapType.EXACT_INPUT
        ),
      };

      // Add app-specific parameters
      if (message && !(finalQuoteParams as any).customRecipientMsg) {
        (finalQuoteParams as any).customRecipientMsg = message;
      }

      if (appName) {
        finalQuoteParams.referral = snakeCase(appName);
      }

      logger.debug('[useMakeQuote] Built quote params:', finalQuoteParams);

      request.current = requestQuote(finalQuoteParams as QuoteRequest);
      quoteResponse = await request.current;
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

    if (isDry) {
      return {
        dry: true as const,
        ...quoteResponse,
        deadline: undefined,
        depositAddress: undefined,
      } as Quote;
    }

    validateQuoteProperty(quoteResponse, 'deadline');
    validateQuoteProperty(quoteResponse, 'depositAddress');

    return {
      dry: false as const,
      ...quoteResponse,
      deadline: quoteResponse.deadline!,
      depositAddress: quoteResponse.depositAddress!,
    } as Quote;
  };

  return {
    make,
    cancel: () => {
      abortController.current.abort('Abort quote manually');
      abortController.current = new AbortController();
    },
  };
};
