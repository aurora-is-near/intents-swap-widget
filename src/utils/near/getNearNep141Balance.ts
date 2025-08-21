import { z } from 'zod';
import once from 'lodash.once';

import { logger } from '@/logger';

import { nearFailoverRpcProvider } from './rpc';
import { decodeQueryResult } from './decodeQueryResult';

type Args = {
  accountId: string;
  tokenAddress: string;
  rpcUrls: string[];
};

const createNearClient = once((rpcUrls: string[]) => {
  return nearFailoverRpcProvider({
    urls: rpcUrls,
  });
});

export const getNearNep141Balance = async ({
  tokenAddress,
  accountId,
  rpcUrls,
}: Args): Promise<bigint | null> => {
  try {
    const args = { account_id: accountId };
    const argsBase64 = Buffer.from(JSON.stringify(args)).toString('base64');
    const nearRpcClient = createNearClient(rpcUrls);

    const response = await nearRpcClient.query({
      request_type: 'call_function',
      method_name: 'ft_balance_of',
      account_id: tokenAddress,
      args_base64: argsBase64,
      finality: 'optimistic',
    });

    const result = decodeQueryResult(response, z.string());
    const balance = BigInt(result);

    return balance;
  } catch (err: unknown) {
    logger.error(
      new Error('error fetching near nep141 balance', { cause: err }),
    );

    return null;
  }
};
