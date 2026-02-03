import {
  createIntentSignerNEP413,
  createInternalTransferRoute,
  createNearWithdrawalRoute,
  FeeExceedsAmountError,
  IntentsSDK,
  MinWithdrawalAmountError,
  type RouteConfig,
} from '@defuse-protocol/intents-sdk';
import type { NearWalletBase as NearWallet } from '@hot-labs/near-connect/build/types/wallet';
import { snakeCase } from 'change-case';
import { generateRandomBytes } from '../utils/near/getRandomBytes';
import { IntentSignerSolana } from '../utils/intents/signers/solana';
import { Providers } from '../types/providers';
import { useIntentsAccountType } from './useIntentsAccountType';
import { logger } from '@/logger';
import { useConfig } from '@/config';
import { TransferError } from '@/errors';
import { INTENTS_CONTRACT } from '@/constants';
import { CHAIN_IDS_MAP } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import { isErrorLikeObject } from '@/utils/isErrorLikeObject';
import { localStorageTyped } from '@/utils/localstorage';
import { queryContract } from '@/utils/near/queryContract';
import { IntentSignerPrivy } from '@/utils/intents/signers/privy';
import { createNearWalletSigner } from '@/utils/intents/signers/near';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

type IntentsTransferArgs = {
  providers?: Providers;
};

type MakeArgs = {
  message?: string;
  onPending: (reason: 'WAITING_CONFIRMATION' | 'PROCESSING') => void;
};

const getDestinationAddress = (ctx: Context, isDirectTransfer: boolean) => {
  if (isDirectTransfer) {
    if (ctx.sendAddress) {
      return ctx.sendAddress;
    }

    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message: 'Send to address is required for a direct transfer' },
    });
  }

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
  const { appName } = useConfig();
  const {
    isNativeNearDeposit,
    isDirectNearTokenWithdrawal,
    isDirectNonNearWithdrawal,
  } = useComputedSnapshot();

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

        await validateNearPublicKey(providers.near(), ctx.walletAddress);

        signer = createNearWalletSigner({
          walletAddress: ctx.walletAddress,
          getProvider: providers.near,
        });

        break;
      }
      default:
        notReachable(intentsAccountType);
    }

    const sdk = new IntentsSDK({ referral: snakeCase(appName) });

    sdk.setIntentSigner(signer);

    let routeConfig: RouteConfig | undefined;

    if (isNativeNearDeposit) {
      routeConfig = undefined;
    } else if (isDirectNearTokenWithdrawal) {
      routeConfig = createNearWithdrawalRoute(message ?? undefined);
    } else if (isDirectNonNearWithdrawal) {
      routeConfig = undefined;
    } else {
      routeConfig = createInternalTransferRoute();
    }

    const withdrawalParams = {
      assetId: ctx.sourceToken.assetId,
      amount: BigInt(ctx.sourceTokenAmount),
      destinationAddress: getDestinationAddress(
        ctx,
        isDirectNearTokenWithdrawal || isDirectNonNearWithdrawal,
      ),
      destinationMemo: undefined,
      feeInclusive: true,
      routeConfig,
    };

    onPending('WAITING_CONFIRMATION');

    try {
      const feeEstimation = await sdk.estimateWithdrawalFee({
        withdrawalParams,
      });

      const { intentHash } = await sdk.signAndSendWithdrawalIntent({
        withdrawalParams,
        feeEstimation,
      });

      onPending('PROCESSING');
      const intentTx = await sdk.waitForIntentSettlement({ intentHash });

      const completionResult = await sdk.waitForWithdrawalCompletion({
        withdrawalParams,
        intentTx,
      });

      return {
        intent: intentTx.hash,
        // no hash means completion not trackable for this bridge
        hash: completionResult.hash ?? '',
        transactionLink: completionResult.hash
          ? getTransactionLink(
              CHAIN_IDS_MAP[ctx.targetToken.blockchain],
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
