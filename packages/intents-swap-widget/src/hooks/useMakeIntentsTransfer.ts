import {
  createIntentSignerNEP413,
  createInternalTransferRoute,
  createNearWithdrawalRoute,
  FeeExceedsAmountError,
  IntentsSDK,
  MinWithdrawalAmountError,
  type RouteConfig,
} from '@defuse-protocol/intents-sdk';
import { snakeCase } from 'change-case';

import { generateRandomBytes } from '../utils/near/getRandomBytes';
import { IntentSignerSolana } from '../utils/intents/signers/solana';
import { Providers } from '../types/providers';

import { useIntentsAccountType } from './useIntentsAccountType';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { TransferError } from '@/errors';
import { INTENTS_CONTRACT } from '@/constants';
import { notReachable } from '@/utils/notReachable';
import { isErrorLikeObject } from '@/utils/isErrorLikeObject';
import { localStorageTyped } from '@/utils/localstorage';
import { queryContract } from '@/utils/near/queryContract';
import { IntentSignerPrivy } from '@/utils/intents/signers/privy';
import { IntentSignerStellar } from '@/utils/intents/signers/stellar';
import { createNearWalletSigner } from '@/utils/intents/signers/near';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { NearWalletBase as NearWallet } from '@/types/near';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

type IntentsTransferArgs = {
  providers?: Providers;
};

type MakeArgs = {
  message?: string;
  onPending: (reason: 'WAITING_CONFIRMATION' | 'PROCESSING') => void;
};

const getDestinationAddress = (ctx: Context) => {
  if (!ctx.quote || ctx.quote.dry) {
    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message: 'Quote is required for intents non-direct transfer' },
    });
  }

  return ctx.quote.depositAddress;
};

const validateNearPublicKey = async (
  nearProvider: NearWallet,
  walletAddress: string,
) => {
  let publicKey = localStorageTyped.getItem('nearWalletsPk')[walletAddress];

  if (!nearProvider.signMessage) {
    throw new TransferError({
      code: 'DIRECT_TRANSFER_ERROR',
      meta: { message: "Your wallet doesn't support signing messages" },
    });
  }

  if (!publicKey) {
    try {
      const res = await nearProvider.signMessage({
        message: 'Authenticate',
        recipient: 'intents.near',
        nonce: Buffer.from(generateRandomBytes(32)),
      });

      if (!res) {
        throw new TransferError({
          code: 'DIRECT_TRANSFER_ERROR',
          meta: { message: 'Signing message failed' },
        });
      }

      publicKey = res.publicKey;
      localStorageTyped.setItem('nearWalletsPk', {
        [walletAddress]: res.publicKey,
      });
    } catch (e: unknown) {
      throw new TransferError({
        code: 'DIRECT_TRANSFER_ERROR',
        meta: { message: "Your wallet doesn't support signing messages" },
      });
    }
  }

  const accountId = getIntentsAccountId({
    walletAddress,
    addressType: 'near',
  });

  const hasPublicKey = await queryContract({
    contractId: INTENTS_CONTRACT,
    methodName: 'has_public_key',
    args: {
      account_id: accountId,
      public_key: publicKey,
    },
  });

  if (!hasPublicKey) {
    try {
      await nearProvider.signAndSendTransactions({
        transactions: [
          {
            receiverId: INTENTS_CONTRACT,
            signerId: walletAddress,
            actions: [
              {
                type: 'FunctionCall',
                params: {
                  methodName: 'add_public_key',
                  args: { public_key: publicKey },
                  gas: '100000000000000',
                  deposit: '1',
                },
              },
            ],
          },
        ],
      });
    } catch (e: unknown) {
      throw new TransferError({
        code: 'DIRECT_TRANSFER_ERROR',
        meta: { message: 'Unable to add public key to intents account' },
      });
    }
  }
};

export const useMakeIntentsTransfer = ({ providers }: IntentsTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useIntentsAccountType();
  const { referral } = useConfig();
  const { isNativeNearDeposit, isDirectNearTokenWithdrawal } =
    useComputedSnapshot();

  const make = async ({
    message,
    onPending,
  }: MakeArgs): Promise<TransferResult | undefined> => {
    if (!ctx.walletAddress) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No connected wallet to sign a transfer.' },
      });
    }

    if (!ctx.sourceToken || !ctx.targetToken) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No token selected to transfer.' },
      });
    }

    if (!ctx.sourceToken.isIntent) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: {
          message:
            'For not intents source token use useMakeQuoteTransfer instead',
        },
      });
    }

    let signer:
      | IntentSignerPrivy
      | ReturnType<typeof createIntentSignerNEP413>
      | undefined;

    if (!intentsAccountType) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Intents account type is not defined' },
      });
    }

    switch (intentsAccountType) {
      case 'evm':
        if (!providers?.evm) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No EVM provider configured' },
          });
        }

        logger.debug('[WIDGET] Use EVM signer for transfer.');
        signer = new IntentSignerPrivy(
          { walletAddress: ctx.walletAddress },
          providers.evm,
        );
        break;

      case 'sol':
        if (!providers?.sol) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No SOL provider configured' },
          });
        }

        logger.debug('[WIDGET] Use SOL signer for transfer.');
        signer = new IntentSignerSolana(
          { walletAddress: ctx.walletAddress },
          providers.sol,
        );

        break;

      case 'near': {
        if (!providers?.near) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No NEAR provider configured' },
          });
        }

        logger.debug('[WIDGET] Use NEAR signer for transfer.');
        await validateNearPublicKey(providers.near(), ctx.walletAddress);

        signer = createNearWalletSigner({
          walletAddress: ctx.walletAddress,
          getProvider: providers.near,
        });

        break;
      }

      case 'stellar': {
        if (!providers?.stellar) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No Stellar provider configured' },
          });
        }

        logger.debug('[WIDGET] Use Stellar signer for transfer.');
        signer = new IntentSignerStellar(
          { walletAddress: ctx.walletAddress },
          providers.stellar,
        );

        break;
      }

      default:
        notReachable(intentsAccountType);
    }

    const sdk = new IntentsSDK({
      referral: snakeCase(referral ?? 'near-intents-widget'),
    });

    sdk.setIntentSigner(signer);

    let routeConfig: RouteConfig | undefined;

    if (isNativeNearDeposit) {
      logger.debug('[WIDGET] Native Near deposit');
      routeConfig = undefined;
    } else if (isDirectNearTokenWithdrawal) {
      logger.debug('[WIDGET] Direct Near token withdrawal');
      routeConfig = createNearWithdrawalRoute(message ?? undefined);
    } else {
      routeConfig = createInternalTransferRoute();
    }

    const withdrawalParams = {
      assetId: ctx.sourceToken.assetId,
      amount: BigInt(ctx.sourceTokenAmount),
      destinationAddress: getDestinationAddress(ctx),
      destinationMemo: undefined,
      feeInclusive: true,
      routeConfig,
    };

    onPending('WAITING_CONFIRMATION');

    try {
      logger.debug('[WIDGET] Fee estimation...', withdrawalParams);

      const feeEstimation = await sdk.estimateWithdrawalFee({
        withdrawalParams,
      });

      if (!feeEstimation) {
        throw new TransferError({
          code: 'TRANSFER_INVALID_INITIAL',
          meta: { message: 'Fee estimation failed' },
        });
      }

      logger.debug('[WIDGET] Sign and send withdrawal intent...');
      const { intentHash } = await sdk.signAndSendWithdrawalIntent({
        withdrawalParams,
        feeEstimation,
      });

      logger.debug('[WIDGET] Wait for intent settlement...');

      onPending('PROCESSING');
      const intentTx = await sdk.waitForIntentSettlement({ intentHash });

      logger.debug('[WIDGET] Wait for withdrawal completion...');

      const completionResult = await sdk.waitForWithdrawalCompletion({
        withdrawalParams,
        intentTx,
      });

      logger.debug('[WIDGET] Withdrawal completed.', completionResult);

      return {
        intent: intentTx.hash,
        // no hash means completion not trackable for this bridge
        hash: completionResult.hash ?? '',
        transactionLink: completionResult.hash
          ? getTransactionLink(
              ctx.targetToken.blockchain,
              completionResult.hash,
            )
          : '',
      };
    } catch (e: unknown) {
      logger.error('[TRANSFER ERROR]', e);

      if (e instanceof MinWithdrawalAmountError) {
        throw new TransferError({
          code: 'MIN_WITHDRAWAL_AMOUNT_ERROR',
          meta: {
            minAmount: formatBigToHuman(
              e.minAmount.toString(),
              ctx.sourceToken.decimals,
            ),
          },
        });
      }

      if (e instanceof FeeExceedsAmountError) {
        throw new TransferError({
          code: 'TRANSFER_INVALID_INITIAL',
          meta: { message: 'Fee is above the maximum allowed' },
        });
      }

      if (isErrorLikeObject(e)) {
        if (e.message.includes('Fee is not estimated')) {
          throw new TransferError({
            code: 'FEES_NOT_ESTIMATED',
          });
        }

        // User rejected
        if (isUserDeniedSigning(e)) {
          logger.warn('User denied signing the transaction');

          return undefined;
        }
      }

      throw new TransferError({
        code: 'DIRECT_TRANSFER_ERROR',
      });
    }
  };

  return { make };
};
