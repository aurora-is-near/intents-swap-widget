import { useCallback, useRef } from 'react';
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
import { feeServiceApi } from '@/network';
import { guardStates } from '@/machine/guards';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getIntentsAccountTypeFromAddress } from '@/utils/chains/getIntentsAccountTypeFromAddress';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { isDryQuote } from '@/machine/guards/checks/isDryQuote';
import { getDryQuoteAddress } from '@/utils/getDryQuoteAddress';
import { useSupportedChains } from './useSupportedChains';
import { useIntentsAccountType } from './useIntentsAccountType';
import { Quote } from '../types';

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
  const { minDepositTokenAmount } = useComputedSnapshot();
  const { intentsAccountType } = useIntentsAccountType();
  const { supportedChains } = useSupportedChains();
  const {
    apiKey,
    appFees,
    fetchQuote,
    referral,
    slippageTolerance,
    extraQuoteParameters,
  } = useConfig();

  const isDry = isDryQuote(ctx);

  const request = useRef<Promise<OneClickQuote>>(null);
  const abortController = useRef<AbortController>(new AbortController());

  const requestQuote = useCallback(
    async (
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
        await feeServiceApi.post<QuoteResponse, AxiosResponse<QuoteResponse>>(
          // no need for extra check API will return missing API key error
          `/api/quote/${apiKey ?? ''}`,
          data,
          { signal },
        )
      ).data.quote;
    },
    [apiKey, fetchQuote],
  );

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

    // address on the target chain should be a dry quote recipient
    const recipientWalletAddress = isDry
      ? getDryQuoteAddress(ctx.targetToken.blockchain)
      : (ctx.walletAddress ?? '');

    const recipientIntentsAccountId = getIntentsAccountId({
      addressType:
        getIntentsAccountTypeFromAddress(recipientWalletAddress) ??
        intentsAccountType,
      walletAddress: recipientWalletAddress,
    });

    // Withdrawals from Aurora reach Intents via the exitToNear precompile,
    // so the source funds always land on Intents — treat like an Intent source
    // for deposit/refund purposes. Refunds go back to the user's EVM-keyed
    // Intents account (refundTo = EVM address, refundType = INTENTS).
    const isAuroraSource = ctx.sourceToken.blockchain === 'aurora';

    const isRefundToIntentAccount =
      recipientIntentsAccountId &&
      (ctx.sourceToken.isIntent ||
        isAuroraSource ||
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

    let commonQuoteParams: Omit<
      QuoteRequest,
      'recipient' | 'recipientType' | 'depositType' | 'refundTo' | 'refundType'
    > = {
      // Settings
      dry: isDry,
      slippageTolerance,
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour

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

      // Experimental
      quoteWaitingTimeMs: 0,

      // to be overridden below
      amount: '0',
      swapType: QuoteRequest.swapType.EXACT_INPUT,
    };

    // UX wise we support FLEX_INPUT only for external deposits
    // while technically it's possible to do swaps with FLEX_INPUT as well
    // maybe in the future we will simplify the conditions here and support FLEX_INPUT for all cases
    if (!ctx.isDepositFromExternalWallet) {
      if (
        quoteType === 'exact_out' &&
        isNotEmptyAmount(ctx.targetTokenAmount)
      ) {
        commonQuoteParams = {
          ...commonQuoteParams,
          amount: ctx.targetTokenAmount,
          swapType: QuoteRequest.swapType.EXACT_OUTPUT,
        };
      } else if (
        quoteType === 'exact_in' &&
        isNotEmptyAmount(ctx.sourceTokenAmount)
      ) {
        commonQuoteParams = {
          ...commonQuoteParams,
          amount: ctx.sourceTokenAmount,
          swapType: QuoteRequest.swapType.EXACT_INPUT,
        };
      } else {
        throw new QuoteError({
          code: 'QUOTE_INVALID_INITIAL',
          meta: { isDry, message: 'No source token amount' },
        });
      }
    } else if (isNotEmptyAmount(ctx.sourceTokenAmount)) {
      commonQuoteParams = {
        ...commonQuoteParams,
        swapType: QuoteRequest.swapType.EXACT_INPUT,
        amount: ctx.sourceTokenAmount,
      };
    } else {
      commonQuoteParams = {
        ...commonQuoteParams,
        swapType: QuoteRequest.swapType.FLEX_INPUT,
        amount: minDepositTokenAmount,
      };
    }

    if (message) {
      commonQuoteParams.customRecipientMsg = message;
    }

    if (referral) {
      commonQuoteParams.referral = snakeCase(referral);
    }

    if (appFees) {
      commonQuoteParams.appFees = [...appFees];
    }

    const { sessionId, virtualChainRecipient, virtualChainRefundRecipient } =
      extraQuoteParameters ?? {};

    // Aurora is a NEAR virtual chain. 1Click forwards the asset by calling
    // ft_transfer_call on the `aurora` bridge account. So `recipient` is the
    // literal "aurora" account, and the user's EVM landing address goes in
    // virtualChainRecipient. virtualChainRefundRecipient is only accepted by
    // 1Click when the source is NEAR/Intents (otherwise refunds must return
    // to the origin chain via refundType=ORIGIN_CHAIN).
    const isAuroraDestination = ctx.targetToken.blockchain === 'aurora';
    const useAuroraRecipient = isAuroraDestination && !ctx.targetToken.isIntent;

    const getAuroraDestinationRecipient = () => {
      if (!isAuroraDestination) {
        return undefined;
      }

      if (!ctx.targetToken.isIntent && ctx.sendAddress) {
        return ctx.sendAddress;
      }

      return recipientWalletAddress;
    };

    const auroraDestinationRecipient = getAuroraDestinationRecipient();

    const supportsAuroraVcRefund =
      isAuroraDestination && (ctx.sourceToken.isIntent || isAuroraSource);

    const auroraSourceRefundRecipient =
      isAuroraSource && !isAuroraDestination
        ? (ctx.walletAddress ?? undefined)
        : undefined;

    const getRecipient = () => {
      if (useAuroraRecipient) {
        return 'aurora';
      }

      if (!ctx.targetToken.isIntent && ctx.sendAddress) {
        return ctx.sendAddress;
      }

      return recipientIntentsAccountId;
    };

    const getRefundTo = () => {
      if (useAuroraRecipient) {
        return supportsAuroraVcRefund ? 'aurora' : (ctx.walletAddress ?? '');
      }

      if (auroraSourceRefundRecipient) {
        return 'aurora';
      }

      return getRefundToAccountId();
    };

    const getRefundType = () => {
      if (useAuroraRecipient || auroraSourceRefundRecipient) {
        return QuoteRequest.refundType.ORIGIN_CHAIN;
      }

      return isRefundToIntentAccount
        ? QuoteRequest.refundType.INTENTS
        : QuoteRequest.refundType.ORIGIN_CHAIN;
    };

    const resolvedVirtualChainRecipient =
      virtualChainRecipient ?? auroraDestinationRecipient;

    const resolvedVirtualChainRefundRecipient =
      virtualChainRefundRecipient ??
      (supportsAuroraVcRefund ? auroraDestinationRecipient : undefined) ??
      auroraSourceRefundRecipient;

    const filteredExtraQuoteParameters = {
      ...(resolvedVirtualChainRecipient
        ? { virtualChainRecipient: resolvedVirtualChainRecipient }
        : {}),
      ...(resolvedVirtualChainRefundRecipient
        ? { virtualChainRefundRecipient: resolvedVirtualChainRefundRecipient }
        : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    try {
      if (ctx.sourceToken.isIntent && ctx.targetToken.isIntent) {
        request.current = requestQuote(
          {
            ...commonQuoteParams,
            ...filteredExtraQuoteParameters,
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
      } else {
        request.current = requestQuote(
          {
            ...commonQuoteParams,
            ...filteredExtraQuoteParameters,
            recipient: getRecipient(),
            recipientType: ctx.targetToken.isIntent
              ? QuoteRequest.recipientType.INTENTS
              : QuoteRequest.recipientType.DESTINATION_CHAIN,
            depositType:
              ctx.sourceToken.isIntent || isAuroraSource
                ? QuoteRequest.depositType.INTENTS
                : QuoteRequest.depositType.ORIGIN_CHAIN,

            // Refund. For Aurora-VC deposits, 1Click requires refundType
            // ORIGIN_CHAIN; if the source is Intents/NEAR the refund target
            // is the literal 'aurora' account, otherwise it's the user's
            // address on the origin chain.
            refundTo: getRefundTo(),
            refundType: getRefundType(),

            depositMode:
              ctx.sourceToken.blockchain === 'stellar'
                ? QuoteRequest.depositMode.MEMO
                : QuoteRequest.depositMode.SIMPLE,
          },
          options,
        );

        quoteResponse = await request.current;
      }
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

        if (errorMessage.includes('Application key not found')) {
          throw new QuoteError({
            code: 'QUOTE_WIDGET_API_KEY_IS_INVALID',
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
        type: 'QUOTE_DRY_WITH_AMOUNT',
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
      type:
        !ctx.isDepositFromExternalWallet ||
        isNotEmptyAmount(ctx.sourceTokenAmount)
          ? 'QUOTE_REAL_WITH_AMOUNT'
          : 'QUOTE_DEPOSIT_ANY_AMOUNT',
      ...quoteResponse,
      deadline: quoteResponse.deadline,
      depositAddress: quoteResponse.depositAddress,
      depositMemo: quoteResponse.depositMemo,
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
