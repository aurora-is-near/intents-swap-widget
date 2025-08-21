import { z } from 'zod';

import type { TokenBalances } from '@/types/token';
import type { BaseTokenInfo } from '@/types/intents';

import { queryContract } from '../near/queryContract';

type BatchArgs = {
  accountId: string;
  tokenIds: string[];
};

async function batchBalanceOf({
  accountId,
  tokenIds,
}: BatchArgs): Promise<bigint[]> {
  const data = await queryContract({
    contractId: 'intents.near',
    methodName: 'mt_batch_balance_of',
    args: {
      account_id: accountId,
      token_ids: tokenIds,
    },
  });

  return z
    .array(z.string())
    .transform((strings) => strings.map(BigInt))
    .parse(data);
}

export async function getIntentsBalances(
  accountId: string,
  tokenIds: BaseTokenInfo['defuseAssetId'][],
): Promise<TokenBalances> {
  const amounts = await batchBalanceOf({
    accountId,
    tokenIds,
  });

  const result: TokenBalances = {};

  for (let i = 0; i < tokenIds.length; i += 1) {
    const tokenId = tokenIds[i];
    const amount = amounts[i];

    if (!tokenId || !amount) {
      // eslint-disable-next-line no-continue
      continue;
    }

    result[tokenId] = BigInt(amount).toString();
  }

  return result;
}
