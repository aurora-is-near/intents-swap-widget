import { z } from 'zod';
import once from 'lodash.once';

import { nearFailoverRpcProvider } from './rpc';
import { logger } from '@/logger';

const createNearClient = once((rpcUrls: string[]) => {
  return nearFailoverRpcProvider({
    urls: rpcUrls,
  });
});

export const getNativeNearBalance = async (
  accountId: string,
  rpcUrls: string[],
): Promise<string | null> => {
  try {
    const nearRpcClient = createNearClient(rpcUrls);

    const response = await nearRpcClient.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'optimistic',
    });

    const result = z.object({ amount: z.string() }).parse(response);

    return result.amount;
  } catch (err: unknown) {
    logger.error(
      new Error('error fetching native near balance', { cause: err }),
    );

    return null;
  }
};
