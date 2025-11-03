import {
  BridgeSDK,
  createIntentSignerNEP413,
  createInternalTransferRoute,
  createNearWithdrawalRoute,
  type RouteConfig,
} from '@defuse-protocol/bridge-sdk';
import type { NearWalletBase as NearWallet } from '@hot-labs/near-connect/build/types/wallet';
import type { Eip1193Provider } from 'ethers';
import { snakeCase } from 'change-case';
import { generateRandomBytes } from '../utils/near/getRandomBytes';
import { IntentSignerSolana } from '../utils/intents/signers/solana';
import type { SolanaWalletAdapter } from '../utils/intents/signers/solana';
import { logger } from '@/logger';
import { useConfig } from '@/config';
import { TransferError } from '@/errors';
import { INTENTS_CONTRACT } from '@/constants';
import { CHAIN_IDS_MAP } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import { localStorageTyped } from '@/utils/localstorage';
import { queryContract } from '@/utils/near/queryContract';
import { IntentSignerPrivy } from '@/utils/intents/signers/privy';
import { createNearWalletSigner } from '@/utils/intents/signers/near';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isUserDeniedSigning } from '@/utils/checkers/isUserDeniedSigning';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

export type IntentsTransferArgs = {
  providers?: {
    sol?: undefined | null | SolanaWalletAdapter;
    evm?: undefined | null | (() => Promise<Eip1193Provider>);
    near?: undefined | null | (() => NearWallet);
  };
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
  const { isDirectTransfer, isDirectNonNearWithdrawal } = useComputedSnapshot();
  const { appName, intentsAccountType } = useConfig();

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

    const sdk = new BridgeSDK({ referral: snakeCase(appName) });

    sdk.setIntentSigner(signer);

    let routeConfig: RouteConfig | undefined;

    if (
      ctx.sourceToken.assetId === WNEAR_ASSET_ID &&
      ctx.targetToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID
    ) {
      routeConfig = undefined;
    } else if (isDirectTransfer) {
      routeConfig = createNearWithdrawalRoute(message ?? undefined);
    } else if (isDirectNonNearWithdrawal) {
      routeConfig = undefined;
    } else {
      routeConfig = createInternalTransferRoute();
    }

    const withdrawal = sdk.createWithdrawal({
      withdrawalParams: {
        assetId: ctx.sourceToken.assetId,
        amount: BigInt(ctx.sourceTokenAmount),
        destinationAddress: getDestinationAddress(
          ctx,
          isDirectTransfer || isDirectNonNearWithdrawal,
        ),
        destinationMemo: undefined,
        feeInclusive: false,
        routeConfig,
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
