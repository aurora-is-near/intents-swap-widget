import { z } from 'zod';
import { decodeQueryResult } from './decodeQueryResult';
import { nearRpcClient } from './rpc';

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

    const response = await nearRpcClient.query({
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
