import type { Action } from '@near-wallet-selector/core';
import { getNearNep141MinStorageBalance } from '../utils/near/getNearNep141MinStorageBalance';
import { getNearNep141StorageBalance } from '../utils/near/getNearNep141StorageBalance';
import { FT_DEPOSIT_GAS, FT_TRANSFER_GAS } from '../utils/near/config';
import { TransferError } from '@/errors';
import { logger } from '@/logger';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Wallet as NearWallet } from '@near-wallet-selector/core';

export function useMakeNEARFtTransferCall(nearWallet: null | undefined | (() => NearWallet)) {
  const { ctx } = useUnsafeSnapshot();
  const sourceTokenAddress = ctx.sourceToken?.contractAddress;
  const recipient = ctx.quote?.depositAddress ?? 'intents.near';
  const amount = ctx.quote?.amountIn ?? ctx.sourceTokenAmount

  const NEARFtTransferCall = async (msgRecipient?: string): Promise<TransferResult | undefined> => {
    if (!nearWallet) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No connected wallet to sign a transfer.' },
      });
    }
    if (!sourceTokenAddress) {
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
    const tokenContractActions: Action[] = [];
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

      if (
        userStorageBalanceResult === BigInt('0') ||
        userStorageBalanceResult < minStorageBalanceResult
      ) {
        tokenContractActions.push({
          type: 'FunctionCall',
          params: {
            methodName: 'storage_deposit',
            args: { account_id: recipient },
            gas: FT_DEPOSIT_GAS,
            deposit: minStorageBalanceResult.toString(),
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
            msg: msgRecipient ?? ''
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

      if (tx && tx.length > 0) {
        return {
          hash: tx[0].transaction?.hash ?? '',
          transactionLink: `https://nearblocks.io/txns/${tx[0].transaction?.hash}`,
          intent: undefined,
        };
      } else {
        throw new TransferError({
          code: 'NO_DEPOSIT_RESULT',
        });
      }
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
