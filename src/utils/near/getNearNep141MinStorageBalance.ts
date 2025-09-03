import { decodeQueryResult } from "./decodeQueryResult";
import { base64 } from '@scure/base';
import { nearRpcClient } from "./rpc";
import { z } from "zod";

export const getNearNep141MinStorageBalance = async ({
  contractId,
}: {
  contractId: string;
}): Promise<bigint> => {
  const response = await nearRpcClient.query({
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
