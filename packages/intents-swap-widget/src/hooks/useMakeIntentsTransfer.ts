import { IntentsSDK } from '@defuse-protocol/intents-sdk';
import { snakeCase } from 'change-case';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { TransferError } from '@/errors';
import { notReachable } from '@/utils/notReachable';
import { localStorageTyped } from '@/utils/localstorage';
import { queryContract } from '@/utils/near/queryContract';
import { isErrorLikeObject } from '@/utils/isErrorLikeObject';
import { IntentSignerPrivy } from '@/utils/intents/signers/privy';
import { IntentSignerStellar } from '@/utils/intents/signers/stellar';
import { createNearWalletSigner } from '@/utils/intents/signers/near';
import { getResponseErrorMessage } from '@/utils/getResponseErrorMessage';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { FALLBACK_REFERRAL, INTENTS_CONTRACT } from '@/constants';
import {
  assertPreparedIntent,
  requestIntentForSigning,
  submitSignedIntent,
} from '@/utils/intents/oneClickIntentApi';

import type { PreparedIntentSigner } from '@/utils/intents/signers/types';
import type { NearWalletBase as NearWallet } from '@/types/near';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

import { IntentSignerSolana } from '../utils/intents/signers/solana';
import { generateRandomBytes } from '../utils/near/getRandomBytes';
import type { Providers } from '../types/providers';
import type { Plugins } from '../types/connectors';

import { useIntentsAccountType } from './useIntentsAccountType';

type IntentsTransferArgs = {
  providers?: Providers;
  plugins?: Plugins;
};

type MakeArgs = {
  onPending: (reason: 'WAITING_CONFIRMATION' | 'PROCESSING') => void;
};

const getDepositAddress = (ctx: Context) => {
  if (!ctx.quote || ctx.quote.dry) {
    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message: 'Quote is required for an intents transfer' },
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

export const useMakeIntentsTransfer = ({
  providers,
  plugins,
}: IntentsTransferArgs) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectNearTokenWithdrawal } = useComputedSnapshot();
  const { intentsAccountType } = useIntentsAccountType();
  const { apiKey, referral } = useConfig();

  const make = async ({
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
            'For a non-intents source token use useMakeQuoteTransfer instead',
        },
      });
    }

    if (!intentsAccountType) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Intents account type is not defined' },
      });
    }

    let signer: PreparedIntentSigner;

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

        const stellarPlugin = plugins?.stellar;

        if (!stellarPlugin) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No Stellar network plugin configured' },
          });
        }

        logger.debug('[WIDGET] Use Stellar signer for transfer.');
        signer = new IntentSignerStellar(
          { walletAddress: ctx.walletAddress },
          providers.stellar,
          stellarPlugin,
        );
        break;
      }

      default:
        notReachable(intentsAccountType);
    }

    const signerId = getIntentsAccountId({
      walletAddress: ctx.walletAddress,
      addressType: intentsAccountType,
    });

    if (!signerId) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Unable to derive the intents signer ID' },
      });
    }

    const depositAddress = getDepositAddress(ctx);

    onPending('WAITING_CONFIRMATION');

    try {
      logger.debug('[WIDGET] Request intent payload from 1Click.', {
        standard: signer.standard,
        signerId,
        depositAddress,
      });

      const generated = await requestIntentForSigning({
        apiKey,
        request: {
          type: 'swap_transfer',
          standard: signer.standard,
          signerId,
          depositAddress,
        },
      });

      assertPreparedIntent(generated.intent, signer.standard);

      logger.debug('[WIDGET] Sign the exact 1Click intent payload.', {
        correlationId: generated.correlationId,
        standard: signer.standard,
      });
      const signedData = await signer.signIntent(generated.intent);

      onPending('PROCESSING');
      logger.debug('[WIDGET] Submit signed intent to 1Click.');
      const submitted = await submitSignedIntent({
        apiKey,
        request: { type: 'swap_transfer', signedData },
      });

      if (!submitted.intentHash) {
        throw new Error('1Click returned no intent hash');
      }

      logger.debug('[WIDGET] Wait for intent settlement.', {
        correlationId: submitted.correlationId,
        intentHash: submitted.intentHash,
      });

      const sdk = new IntentsSDK({
        referral: snakeCase(referral ?? FALLBACK_REFERRAL),
      });

      const intentTx = await sdk.waitForIntentSettlement({
        intentHash: submitted.intentHash,
      });

      logger.debug('[WIDGET] Intent settled.', intentTx);

      return {
        intent: submitted.intentHash,
        hash: intentTx.hash,
        transactionLink: isDirectNearTokenWithdrawal
          ? getTransactionLink(intentTx.hash, { isDirectNearTransfer: true })
          : getTransactionLink(depositAddress),
        isOneClickDeposit: !isDirectNearTokenWithdrawal,
      };
    } catch (e: unknown) {
      logger.error('[TRANSFER ERROR]', e);

      if (isErrorLikeObject(e) && isUserDeniedSigning(e)) {
        logger.warn('User denied signing the transaction');

        return undefined;
      }

      throw new TransferError({
        code: 'DIRECT_TRANSFER_ERROR',
        meta: {
          message: getResponseErrorMessage(e) ?? 'Unable to submit the intent',
        },
      });
    }
  };

  return { make };
};
