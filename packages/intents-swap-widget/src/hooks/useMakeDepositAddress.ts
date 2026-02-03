import { useMemo, useRef } from 'react';
import { AxiosError, AxiosResponse, CanceledError } from 'axios';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { guardStates } from '@/machine/guards';
import { bridgeApi, oneClickApi } from '@/network';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { CHAIN_POA_MAP, POA_EVM_CHAIN_ID } from '@/constants/chains';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import type { Quote } from '@/types/quote';

type DepositAddressRequest = {
  accountId: string;
  chain: string;
};

type DepositAddressResponse = {
  result: {
    address: string;
  };
};

export const useMakeDepositAddress = () => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useConfig();
  const { isNativeNearDeposit } = useComputedSnapshot();

  const intentsAccountId = getIntentsAccountId({
    addressType: intentsAccountType,
    walletAddress: ctx.walletAddress ?? '',
  });

  const request = useRef<Promise<AxiosResponse<DepositAddressResponse>>>(null);
  const abortController = useRef<AbortController>(new AbortController());

  const requestDepositAddress = useMemo(() => {
    return async (data: DepositAddressRequest) => {
      return bridgeApi.post<
        DepositAddressResponse,
        AxiosResponse<DepositAddressResponse>
      >(
        '',
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'deposit_address',
          params: [
            {
              account_id: data.accountId,
              chain: data.chain,
            },
          ],
        },
        {
          signal: abortController.current.signal,
        },
      );
    };
  }, [oneClickApi]);

  const make = async (): Promise<Quote | undefined> => {
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
        meta: { isDry: false, message: msg },
      });
    }

    if (
      (isNativeNearDeposit && !ctx.isDepositFromExternalWallet) ||
      (!isNativeNearDeposit &&
        ctx.sourceToken.assetId !== ctx.targetToken.assetId)
    ) {
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: {
          isDry: false,
          message: 'Asset IDs are not the same use 1Click Quote instead of POA',
        },
      });
    }

    if (ctx.sourceToken.isIntent) {
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: {
          isDry: false,
          message: 'For withdrawals use withdrawal SDK instead of POA',
        },
      });
    }

    if (
      !ctx.isDepositFromExternalWallet &&
      ctx.sourceToken.blockchain === 'near'
    ) {
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: {
          isDry: false,
          message:
            'Use transfer call. POA for tokens on Near only used for external deposits',
        },
      });
    }

    if (!intentsAccountId) {
      const msg = 'No corresponding intents account to run a quote';

      logger.error(`[WIDGET] ${msg}`);
      throw new QuoteError({
        code: 'QUOTE_INVALID_INITIAL',
        meta: { isDry: false, message: msg },
      });
    }

    if (request.current) {
      abortController.current.abort('Abort previous quote (auto)');
      abortController.current = new AbortController();
    }

    let chainId = CHAIN_POA_MAP[ctx.targetToken.blockchain];

    if (!chainId) {
      const isEvm = isEvmChain(ctx.targetToken.blockchain);

      if (isEvm) {
        chainId = POA_EVM_CHAIN_ID;
      } else {
        throw new QuoteError({
          code: 'QUOTE_INVALID_INITIAL',
          meta: { isDry: false, message: 'Chain is not supported by POA' },
        });
      }
    }

    try {
      request.current = requestDepositAddress({
        chain: chainId,
        accountId: intentsAccountId,
      });

      const response = (await request.current).data;

      return {
        depositAddress: response.result.address,
        amountIn: ctx.sourceTokenAmount,
        amountOut: ctx.targetTokenAmount,
        amountInUsd: `${
          parseFloat(
            formatBigToHuman(ctx.sourceTokenAmount, ctx.sourceToken.decimals),
          ) * ctx.sourceToken.price
        }`,
        amountOutUsd: `${
          parseFloat(
            formatBigToHuman(ctx.targetTokenAmount, ctx.targetToken.decimals),
          ) * ctx.targetToken.price
        }`,
        amountOutFormatted: formatBigToHuman(
          ctx.targetTokenAmount,
          ctx.targetToken.decimals,
        ),
        // dummy values to match quote type
        deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        timeEstimate: 0,
        dry: false,
      };
    } catch (error: unknown) {
      if (error instanceof CanceledError) {
        return;
      }

      logger.error(error);

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data.message || error.message;

        throw new QuoteError({
          code: 'QUOTE_FAILED',
          meta: {
            message: errorMessage ?? 'Failed to fetch quote. Please try again.',
          },
        });
      }
    }
  };

  return {
    make,
    cancel: () => {
      abortController.current.abort('Abort quote manually');
      abortController.current = new AbortController();
    },
  };
};
