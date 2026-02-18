import z from 'zod'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  BlockId,
  BlockReference,
  Finality,
  Provider,
} from 'near-api-js/lib/providers/provider';
import type {
  NearConnector,
  SignMessageParams,
  SignAndSendTransactionsParams,
} from '@hot-labs/near-connect';
import { base64 } from '@scure/base';
import type { NearWalletBase } from '@hot-labs/near-connect/build/types/wallet';
import type { Action } from '@hot-labs/near-connect/build/types/transactions';

import { logger } from '@/logger';
import type { MakeTransferArgs, TransferResult } from '@/types';

import { nearClient } from './nearClient';

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

  return schema.parse(JSON.parse(result));
}

export type OptionalBlockReference = {
  blockId?: BlockId;
  finality?: Finality;
};

function getBlockReference({
  blockId,
  finality,
}: OptionalBlockReference): BlockReference {
  if (blockId != null) {
    return { blockId };
  }

  if (finality != null) {
    return { finality };
  }

  return { finality: 'optimistic' };
}

export async function queryContract({
  nearClient,
  contractId,
  methodName,
  args,
  blockId,
  finality,
}: {
  nearClient: Provider;
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
  blockId?: BlockId;
  finality?: Finality;
}): Promise<unknown> {
  const response = await nearClient.query({
    request_type: 'call_function',
    account_id: contractId,
    method_name: methodName,
    args_base64: btoa(JSON.stringify(args)),
    ...getBlockReference({ blockId, finality }),
  });

  return decodeQueryResult(response, z.unknown());
}

export const getNearNep141StorageBalance = async ({
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

    return BigInt(parsed?.total || '0');
  } catch (err: unknown) {
    throw new Error('Error fetching balance', { cause: err });
  }
};

export const getNearNep141MinStorageBalance = async ({
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

export const useNearProvider = () => {
  const [connector, setConnector] = useState<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletProviderName, setWalletProviderName] = useState<string | null>(
    null,
  );

  const [nearBasedWallet, setNearBasedWallet] = useState<NearWalletBase | null>(
    null,
  );

  const init = useCallback(async () => {
    if (connector) {
      return connector;
    }

    // NearConnector uses window object, so we need to import it dynamically,
    // otherwise compiler complains that window is not defined, even though it is "use client"
    const { NearConnector } =
      await import('@hot-labs/near-connect/build/NearConnector');

    let newConnector: NearConnector | null = null;

    try {
      newConnector = new NearConnector({
        network: 'mainnet',
      });
    } catch (err) {
      const error = err as Error;

      logger.error(error);

      return;
    }

    // Set up event listeners
    newConnector.on('wallet:signOut', () => {
      setAccountId(null);
      setNearBasedWallet(null);
      setWalletProviderName(null);
    });
    newConnector.on('wallet:signIn', (t) => {
      setNearBasedWallet(t.wallet);
      setAccountId(t.accounts?.[0]?.accountId ?? null);
      setWalletProviderName(t.wallet?.manifest?.name ?? null);
    });

    setConnector(newConnector);

    try {
      const wallet = await newConnector.wallet();
      const accounts = await wallet.getAccounts();

      if (accounts?.[0]) {
        setNearBasedWallet(wallet);
        setAccountId(accounts[0].accountId);
        setWalletProviderName(wallet.manifest?.name ?? null);
      }
    } catch (err) {
      const error = err as Error;

      logger.error(error);
    }

    return newConnector;
  }, [connector]);

  useEffect(() => {
    init();
  }, [init]);

  const connect = useCallback(async () => {
    const newConnector = connector ?? (await init());

    if (newConnector) {
      await newConnector.connect();
    }
  }, [connector, init]);

  const disconnect = useCallback(async () => {
    if (!connector) {
      return;
    }

    await connector.disconnect();
  }, [connector]);

  const signMessage = useCallback(
    async (message: SignMessageParams) => {
      if (!connector) {
        throw new Error('Connector not initialized');
      }

      const wallet = await connector.wallet();
      const signatureData = await wallet.signMessage(message);

      return { signatureData, signedData: message };
    },
    [connector],
  );

  const signAndSendTransactions = useCallback(
    async (params: SignAndSendTransactionsParams) => {
      if (!connector) {
        throw new Error('Connector not initialized');
      }

      const wallet = await connector.wallet();

      return wallet.signAndSendTransactions(params);
    },
    [connector],
  );

  return useMemo(() => {
    return {
      connector,
      accountId,
      nearBasedWallet,
      walletProviderName,
      connect,
      disconnect,
      signMessage,
      signAndSendTransactions,
    };
  }, [
    connector,
    walletProviderName,
    accountId,
    nearBasedWallet,
    connect,
    disconnect,
    signMessage,
    signAndSendTransactions,
  ]);
}

const transferNativeNear = async ({
  wallet,
  sender,
  recipient,
  amount,
}: {
  sender: string;
  amount: string; // Amount in yoctoNEAR
  recipient: string;
  wallet: ReturnType<typeof useNearProvider>;
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

  if (tx && tx?.[0]) {
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
  nearWallet: ReturnType<typeof useNearProvider>,
  tokenAddress: string,
  to: string,
  amount: string,
  signedAccountId?: string | null,
): Promise<TransferResult | null> {
  if (tokenAddress === 'native-near') {
    if (!signedAccountId || !nearWallet) {
      throw new Error('No signed account found. Please connect your wallet.');
    }

    const response = await transferNativeNear({
      amount,
      recipient: to,
      wallet: nearWallet,
      sender: signedAccountId,
    });

    return response;
  }

  const tokenContractActions: Action[] = [];
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
  const tx = await nearWallet.signAndSendTransactions({
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

export function useMakeNearTransfer() {
  const nearBaseWallet = useNearProvider();

  async function send({
    address: to,
    amount,
    tokenAddress,
  }: MakeTransferArgs): Promise<TransferResult | undefined | null> {
    if (!tokenAddress) {
        throw new Error(
          'Token address is required for NEAR transfers. Or no intents account id.',
        );
      }

      const txHash = await transferNEARToken(
        nearBaseWallet,
        tokenAddress,
        to,
        amount,
        nearBaseWallet.accountId,
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
