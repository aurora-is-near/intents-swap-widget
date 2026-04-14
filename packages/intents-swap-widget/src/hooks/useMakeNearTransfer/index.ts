import z from 'zod';
import { base64 } from '@scure/base';

import { nearClient } from './nearClient';

import type {
  MakeTransferArgs,
  NearAction,
  NearWalletBase,
  TransferResult,
} from '@/types';

/**
 * Use this function to decode a raw response from `nearClient.query()`
 */
function decodeQueryResult<T extends z.ZodTypeAny>(
  response: unknown,
  schema: T,
): z.infer<T> {
  const parsed = z.object({ result: z.array(z.number()) }).parse(response);
  const uint8Array = new Uint8Array(parsed.result);
  const decoder = new TextDecoder();
  const result = decoder.decode(uint8Array);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return schema.parse(JSON.parse(result)) as z.infer<T>;
}

const getNearNep141StorageBalance = async ({
  contractId,
  accountId,
}: {
  contractId: string;
  accountId: string;
}): Promise<bigint> => {
  try {
    const args = { account_id: accountId };
    const argsBase64 = Buffer.from(JSON.stringify(args)).toString('base64');

    const response = await nearClient.query({
      request_type: 'call_function',
      method_name: 'storage_balance_of',
      account_id: contractId,
      args_base64: argsBase64,
      finality: 'optimistic',
    });

    const parsed = decodeQueryResult(
      response,
      z.union([z.null(), z.object({ total: z.string() })]),
    );

    return BigInt(parsed?.total ?? '0');
  } catch (err: unknown) {
    throw new Error('Error fetching balance', { cause: err });
  }
};

const getNearNep141MinStorageBalance = async ({
  contractId,
}: {
  contractId: string;
}): Promise<bigint> => {
  const response = await nearClient.query({
    request_type: 'call_function',
    method_name: 'storage_balance_bounds',
    account_id: contractId,
    args_base64: base64.encode(new TextEncoder().encode(JSON.stringify({}))),
    finality: 'optimistic',
  });

  const parsed = decodeQueryResult(
    response,
    z.object({ min: z.string(), max: z.string() }),
  );

  return BigInt(parsed.min);
};

const FT_DEPOSIT_GAS = `30${'0'.repeat(12)}`; // 30 TGAS
const FT_TRANSFER_GAS = `50${'0'.repeat(12)}`; // 30 TGAS

const transferNativeNear = async ({
  wallet,
  sender,
  recipient,
  amount,
}: {
  sender: string;
  amount: string; // Amount in yoctoNEAR
  recipient: string;
  wallet: NearWalletBase;
}) => {
  const tx = await wallet.signAndSendTransactions({
    transactions: [
      {
        signerId: sender,
        receiverId: recipient,
        actions: [
          {
            type: 'Transfer',
            params: {
              deposit: amount,
            },
          },
        ],
      },
    ],
  });

  if (tx?.[0]) {
    return {
      hash: tx[0].transaction?.hash ?? '',
      transactionLink: `https://nearblocks.io/txns/${tx[0].transaction?.hash}`,
    };
  }

  return {
    hash: '',
    transactionLink: '',
  };
};

async function transferNEARToken(
  wallet: NearWalletBase,
  tokenAddress: string,
  to: string,
  amount: string,
  signedAccountId?: string | null,
): Promise<TransferResult | null> {
  if (tokenAddress === 'native-near') {
    if (!signedAccountId || !wallet) {
      throw new Error('No signed account found. Please connect your wallet.');
    }

    const response = await transferNativeNear({
      amount,
      recipient: to,
      wallet,
      sender: signedAccountId,
    });

    return response;
  }

  const tokenContractActions: NearAction[] = [];
  const [minStorageBalanceResult, userStorageBalanceResult] = await Promise.all(
    [
      getNearNep141MinStorageBalance({
        contractId: tokenAddress,
      }),
      getNearNep141StorageBalance({
        contractId: tokenAddress,
        accountId: to,
      }),
    ],
  );

  if (
    userStorageBalanceResult === BigInt('0') ||
    userStorageBalanceResult < minStorageBalanceResult
  ) {
    tokenContractActions.push({
      type: 'FunctionCall',
      params: {
        methodName: 'storage_deposit',
        args: { account_id: to },
        gas: FT_DEPOSIT_GAS,
        deposit: minStorageBalanceResult.toString(),
      },
    });
  }

  tokenContractActions.push({
    type: 'FunctionCall',
    params: {
      methodName: 'ft_transfer',
      args: {
        receiver_id: to,
        amount,
      },
      gas: FT_TRANSFER_GAS,
      deposit: '1',
    },
  });
  const tx = await wallet.signAndSendTransactions({
    transactions: [
      {
        receiverId: tokenAddress,
        actions: tokenContractActions,
      },
    ],
  });

  if (tx?.[0]) {
    return {
      hash: tx[0].transaction?.hash ?? '',
      transactionLink: `https://nearblocks.io/txns/${tx[0].transaction?.hash}`,
    };
  }

  return null;
}

export function useMakeNearTransfer({
  provider,
  accountId,
}: {
  provider: (() => NearWalletBase) | null | undefined;
  accountId: string | null | undefined;
}) {
  async function send({
    address: to,
    amount,
    tokenAddress,
  }: MakeTransferArgs): Promise<TransferResult | undefined | null> {
    if (!provider) {
      throw new Error('No NEAR wallet provider configured.');
    }

    if (!tokenAddress) {
      throw new Error(
        'Token address is required for NEAR transfers. Or no intents account id.',
      );
    }

    const wallet = provider();

    const txHash = await transferNEARToken(
      wallet,
      tokenAddress,
      to,
      amount,
      accountId,
    );

    return txHash;
  }

  const make = async (transferArgs: MakeTransferArgs) => {
    const tx = await send(transferArgs);

    return tx ?? null;
  };

  return {
    make,
  };
}
