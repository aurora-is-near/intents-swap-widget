import { z } from 'zod';

import { logger } from '@/logger';
import { nearFailoverRpcProvider } from './rpc';

export const getNativeNearBalance = async (
  accountId: string,
  rpcUrls: string[],
): Promise<string | null> => {
  try {
    const nearRpcClient = nearFailoverRpcProvider({ urls: rpcUrls });

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
