import type { Action, Wallet as NearWallet } from '@near-wallet-selector/core';

import { logger } from '@/logger';
import { TransferError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine/snap';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import type { TransferResult } from '@/types/transfer';

import { FT_DEPOSIT_GAS, FT_TRANSFER_GAS } from '../utils/near/config';
import { getNearNep141StorageBalance } from '../utils/near/getNearNep141StorageBalance';
import { getNearNep141MinStorageBalance } from '../utils/near/getNearNep141MinStorageBalance';

export function useMakeNEARFtTransferCall(
  nearWallet: null | undefined | (() => NearWallet),
) {
  const { ctx } = useUnsafeSnapshot();
  const sourceTokenAddress = ctx.sourceToken?.contractAddress;
  const amount = ctx.quote?.amountIn ?? ctx.sourceTokenAmount;

  const NEARFtTransferCall = async (
    recipient: string,
    msgRecipient?: string,
  ): Promise<TransferResult | undefined> => {
    if (!nearWallet) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No connected wallet to sign a transfer.' },
      });
    }

    if (
      !sourceTokenAddress &&
      ctx.sourceToken?.assetId !== NATIVE_NEAR_DUMB_ASSET_ID
    ) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No token selected to transfer.' },
      });
    }

    if (!recipient) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No recipient address to transfer.' },
      });
    }

    if (!amount) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No amount to transfer.' },
      });
    }

    const wallet = nearWallet();

    if (
      ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID &&
      ctx.targetToken?.assetId !== WNEAR_ASSET_ID
    ) {
      const tx = await wallet.signAndSendTransactions({
        transactions: [
          {
            signerId: ctx.walletAddress,
            receiverId: recipient,
            actions: [
              {
                type: 'Transfer',
                params: {
                  deposit: amount, // Amount in yoctoNEAR
                },
              },
            ],
          },
        ],
      });

      if (tx && tx.length > 0) {
        return {
          hash: tx[0]?.transaction?.hash ?? '',
          transactionLink: `https://nearblocks.io/txns/${tx[0]?.transaction?.hash}`,
          intent: undefined,
        };
      }

      return {
        hash: '',
        transactionLink: '',
        intent: undefined,
      };
    }

    const tokenContractActions: Action[] = [];

    if (
      ctx.targetToken &&
      ctx.sourceToken.assetId === NATIVE_NEAR_DUMB_ASSET_ID &&
      ctx.targetToken.assetId === WNEAR_ASSET_ID
    ) {
      try {
        tokenContractActions.push({
          type: 'FunctionCall',
          params: {
            methodName: 'near_deposit',
            gas: FT_DEPOSIT_GAS,
            deposit: amount,
            args: {},
          },
        });

        tokenContractActions.push({
          type: 'FunctionCall',
          params: {
            methodName: 'ft_transfer_call',
            deposit: '1', // 1 yocto required by NEP-141
            gas: FT_TRANSFER_GAS,
            args: {
              amount,
              receiver_id: recipient,
              msg: msgRecipient ?? '',
            },
          },
        });

        const tx = await wallet.signAndSendTransactions({
          transactions: [
            {
              receiverId: 'wrap.near',
              actions: tokenContractActions,
            },
          ],
        });

        if (tx?.[0]?.transaction?.hash) {
          return {
            hash: tx[0].transaction?.hash ?? '',
            transactionLink: `https://nearblocks.io/txns/${tx[0].transaction?.hash}`,
            intent: undefined,
          };
        }

        throw new TransferError({
          code: 'NO_DEPOSIT_RESULT',
        });
      } catch (err: unknown) {
        logger.error('[TRANSFER ERROR]', err);
        throw new TransferError({
          code: 'DIRECT_TRANSFER_ERROR',
        });
      }
    }

    if (!sourceTokenAddress) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No token selected to transfer.' },
      });
    }

    try {
      const [minStorageBalanceResult, userStorageBalanceResult] =
        await Promise.all([
          getNearNep141MinStorageBalance({
            contractId: sourceTokenAddress,
          }),
          getNearNep141StorageBalance({
            contractId: sourceTokenAddress,
            accountId: recipient,
          }),
        ]);

      const storageDelta = minStorageBalanceResult - userStorageBalanceResult;

      if (storageDelta > 0n) {
        tokenContractActions.push({
          type: 'FunctionCall',
          params: {
            methodName: 'storage_deposit',
            args: { account_id: recipient },
            gas: FT_DEPOSIT_GAS,
            deposit: storageDelta.toString(),
          },
        });
      }

      tokenContractActions.push({
        type: 'FunctionCall',
        params: {
          methodName: 'ft_transfer_call',
          args: {
            receiver_id: recipient,
            amount,
            msg: msgRecipient ?? '',
          },
          gas: FT_TRANSFER_GAS,
          deposit: '1',
        },
      });

      const tx = await wallet.signAndSendTransactions({
        transactions: [
          {
            receiverId: sourceTokenAddress,
            actions: tokenContractActions,
          },
        ],
      });

      if (tx?.[0]?.transaction?.hash) {
        return {
          hash: tx[0].transaction?.hash ?? '',
          transactionLink: `https://nearblocks.io/txns/${tx[0].transaction?.hash}`,
          intent: undefined,
        };
      }

      throw new TransferError({
        code: 'NO_DEPOSIT_RESULT',
      });
    } catch (err: unknown) {
      logger.error('[TRANSFER ERROR]', err);
      throw new TransferError({
        code: 'DIRECT_TRANSFER_ERROR',
      });
    }
  };

  return {
    make: NEARFtTransferCall,
  };
}
