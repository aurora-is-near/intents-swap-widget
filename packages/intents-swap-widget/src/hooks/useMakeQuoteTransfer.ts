import axios from 'axios';
import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';

import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID } from '@/constants/tokens';
import { isErrorLikeObject } from '@/utils/isErrorLikeObject';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import type {
  MakeTransfer,
  MakeTransferArgs,
  TransferResult,
} from '@/types/transfer';
import { EVM_CHAIN_IDS_MAP } from '../constants/chains';
import { isEvmBaseToken, isEvmChain } from '../utils';
import { useMakeNearTransfer } from './useMakeNearTransfer';
import { Providers } from '../types/providers';
import { Plugins } from '../types/connectors';
import { getSupportedProviderType } from '../utils/chains/getSupportedProviderType';
import { useConfig } from '../config';

type QuoteTransferArgs = {
  makeTransfer?: MakeTransfer;
  providers?: Providers;
  plugins?: Plugins;
};

function assertChainSupport(
  property: unknown,
  message: string,
): asserts property {
  if (!property) {
    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message },
    });
  }
}

export const useMakeQuoteTransfer = ({
  makeTransfer,
  providers,
  plugins,
}: QuoteTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();
  const { alchemyApiKey } = useConfig();

  const { make: makeNearTransfer } = useMakeNearTransfer({
    provider: providers?.near,
    accountId: ctx.walletAddress,
  });

  const getTransferFunction = (depositAddress: string) => {
    const providerType = getSupportedProviderType(depositAddress);

    if (makeTransfer) {
      return makeTransfer;
    }

    if (providerType === 'evm') {
      const evmPlugin = plugins?.evm;

      assertChainSupport(
        evmPlugin,
        'EVM transfers are not supported. Add the EVM plugin from @aurora-is-near/intents-swap-widget-evm via the `plugins` configuration property.',
      );

      const provider = providers?.evm;

      assertChainSupport(
        provider,
        'EVM transfers are not supported. Add an EVM provider via the `providers` configuration property.',
      );

      return (args: MakeTransferArgs) =>
        evmPlugin.makeTransfer(args, { provider });
    }

    if (providerType === 'sol') {
      const solPlugin = plugins?.sol;
      const provider = providers?.sol;

      assertChainSupport(
        solPlugin,
        'Solana transfers are not supported. Add the Solana plugin from @aurora-is-near/intents-swap-widget-solana via the `plugins` configuration property.',
      );

      assertChainSupport(
        provider,
        'Solana transfers are not supported. Add a Solana provider via the `providers` configuration property.',
      );

      assertChainSupport(
        alchemyApiKey,
        'Solana transfers are not supported. Add an Alchemy API key via the `alchemyApiKey` configuration property.',
      );

      return (args: MakeTransferArgs) =>
        solPlugin.makeTransfer(args, { provider, alchemyApiKey });
    }

    if (providerType === 'near') {
      return makeNearTransfer;
    }

    if (providerType === 'stellar') {
      const stellarPlugin = plugins?.stellar;
      const provider = providers?.stellar;

      assertChainSupport(
        stellarPlugin,
        'Stellar transfers are not supported. Add the Stellar plugin from @aurora-is-near/intents-swap-widget-stellar via the `plugins` configuration property.',
      );

      assertChainSupport(
        provider,
        'Stellar transfers are not supported. Add a Stellar provider via the `providers` configuration property.',
      );

      return (args: MakeTransferArgs) => {
        if (!ctx.quote) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'Quote is required for a Stellar transfer.' },
          });
        }

        // not reachable here just for type safety
        if (ctx.quote.type === 'QUOTE_DRY_WITH_AMOUNT') {
          return;
        }

        if (!ctx.quote.depositMemo) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: {
              message: 'Quote has no deposit memo for Stellar transfer.',
            },
          });
        }

        return stellarPlugin.makeTransfer(
          { ...args, memo: ctx.quote.depositMemo },
          { provider },
        );
      };
    }

    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message: 'No transfer function established.' },
    });
  };

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

    if (ctx.quote.type === 'QUOTE_DEPOSIT_ANY_AMOUNT') {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Quote has no source amount' },
      });
    }

    const makeTransferArgs: MakeTransferArgs = {
      amount: ctx.quote.amountIn,
      decimals: ctx.sourceToken.decimals,
      address: ctx.quote.depositAddress,
      chain: ctx.sourceToken.blockchain,
      evmChainId: isEvmChain(ctx.sourceToken.blockchain)
        ? EVM_CHAIN_IDS_MAP[ctx.sourceToken.blockchain]
        : null,
      isNativeEvmTokenTransfer:
        !!ctx.sourceToken && isEvmBaseToken(ctx.sourceToken),
      tokenAddress:
        ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
          ? NATIVE_NEAR_DUMB_ASSET_ID
          : ctx.sourceToken.contractAddress,
      sourceAssetId: ctx.sourceToken.assetId,
      targetAssetId: ctx.targetToken.assetId,
    };

    const transferFunction = getTransferFunction(makeTransferArgs.address);

    try {
      const depositResult = await transferFunction(makeTransferArgs);

      if (!depositResult) {
        // A custom make transfer function may not return a deposit result. We
        // may choose to defer processing, for example, and show the success
        // state at some later time.
        if (makeTransfer) {
          return;
        }

        logger.error('[TRANSFER ERROR]', 'No deposit result');
        throw new TransferError({
          code: 'NO_DEPOSIT_RESULT',
        });
      }

      // Proactively notify 1Click of the deposit so its indexer doesn't have
      // to discover the tx on its own. This speeds up status resolution.
      void OneClickService.submitDepositTx({
        txHash: depositResult.hash,
        depositAddress: ctx.quote.depositAddress,
      }).catch((e) => {
        logger.warn('Failed to submit deposit tx to 1Click', e);
      });

      return {
        hash: depositResult.hash,
        transactionLink: depositResult.transactionLink,
        intent: undefined,
        isOneClickDeposit: true,
      };
    } catch (error: unknown) {
      logger.error('[TRANSFER ERROR]', error, { error });
      let errorMessage = 'Failed to make a transfer. Please try again.';

      const userCancelledTx =
        isErrorLikeObject(error) && isUserDeniedSigning(error);

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
