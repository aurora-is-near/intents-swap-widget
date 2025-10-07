import {
  BridgeSDK,
  createIntentSignerNEP413,
  createInternalTransferRoute,
  createNearWithdrawalRoute,
} from '@defuse-protocol/bridge-sdk';
import type { Wallet as NearWallet } from '@near-wallet-selector/core';
import type { Eip1193Provider } from 'ethers';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { TransferError } from '@/errors';
import { CHAIN_IDS_MAP } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import { queryContract } from '@/utils/near/queryContract';
import { IntentSignerPrivy } from '@/utils/intents/signers/privy';
import { createNearWalletSigner } from '@/utils/intents/signers/near';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

export type IntentsTransferArgs = {
  providers: {
    sol?: undefined | null | (() => Promise<Eip1193Provider>);
    evm?: undefined | null | (() => Promise<Eip1193Provider>);
    near?: undefined | null | (() => NearWallet);
  };
};

type MakeArgs = {
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
  const accounts = await nearProvider.getAccounts();
  const walletAccounts = accounts.filter((a) => a.accountId === walletAddress);

  if (walletAccounts.length > 1) {
    throw new TransferError({
      code: 'DIRECT_TRANSFER_ERROR',
      meta: { message: 'Multiple accounts found for connected Near wallet' },
    });
  }

  const { publicKey } = walletAccounts[0]!;

  if (!publicKey) {
    throw new TransferError({
      code: 'DIRECT_TRANSFER_ERROR',
      meta: { message: 'No public key found for connected Near wallet' },
    });
  }

  const accountId = getIntentsAccountId({
    walletAddress,
    addressType: 'near',
  });

  const hasPublicKey = await queryContract({
    contractId: 'intents.near',
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
            receiverId: 'intents.near',
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
  const { isDirectTransfer } = useComputedSnapshot();
  const { appName, intentsAccountType } = useConfig();

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
            'For not intents source token use useMakeQuoteTransfer instead',
        },
      });
    }

    let signer:
      | IntentSignerPrivy
      | ReturnType<typeof createIntentSignerNEP413>
      | undefined;

    switch (intentsAccountType) {
      case 'evm':
        if (!providers.evm) {
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
        if (!providers.sol) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No SOL provider configured' },
          });
        }

        signer = new IntentSignerPrivy(
          { walletAddress: ctx.walletAddress },
          providers.sol,
        );

        break;

      case 'near': {
        if (!providers.near) {
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

    const sdk = new BridgeSDK({ referral: appName });

    sdk.setIntentSigner(signer);

    const withdrawal = sdk.createWithdrawal({
      withdrawalParams: {
        assetId: ctx.sourceToken.assetId,
        amount: BigInt(ctx.sourceTokenAmount),
        destinationAddress: getDestinationAddress(ctx, isDirectTransfer),
        destinationMemo: undefined,
        feeInclusive: false,
        routeConfig: isDirectTransfer
          ? createNearWithdrawalRoute(
              getIntentsAccountId({
                walletAddress: ctx.walletAddress,
                addressType: intentsAccountType,
              }) ?? undefined,
            )
          : createInternalTransferRoute(),
      },
    });

    try {
      await withdrawal.estimateFee();

      onPending('WAITING_CONFIRMATION');
      const txIntent = await withdrawal.signAndSendIntent();

      onPending('PROCESSING');
      const tx = await withdrawal.waitForIntentSettlement();

      await withdrawal.waitForWithdrawalCompletion();

      return {
        hash: tx.hash,
        transactionLink: getTransactionLink(CHAIN_IDS_MAP.near, tx.hash),
        intent: txIntent,
      };
    } catch (e: unknown) {
      logger.error('[TRANSFER ERROR]', e);

      if (e instanceof Error) {
        if (e.message.includes('Fee is not estimated')) {
          throw new TransferError({
            code: 'FEES_NOT_ESTIMATED',
          });
        }

        // User rejected
        if (
          isUserDeniedSigning(e.message) ||
          isUserDeniedSigning(`${e.cause}`)
        ) {
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
