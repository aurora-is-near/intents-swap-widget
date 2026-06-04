import { z } from 'zod';

import { getNearRpcClient } from './rpc';
import { getBlockReference } from './getBlockReference';
import { decodeQueryResult } from './decodeQueryResult';
import type { QueryArgs } from './types';

export const queryContract = async ({
  contractId,
  methodName,
  args,
  blockId,
  finality,
}: QueryArgs): Promise<unknown> => {
  const response = await getNearRpcClient().query({
    request_type: 'call_function',
    account_id: contractId,
    method_name: methodName,
    args_base64: btoa(JSON.stringify(args)),
    ...getBlockReference({ blockId, finality }),
  });

  return decodeQueryResult(response, z.unknown());
};
