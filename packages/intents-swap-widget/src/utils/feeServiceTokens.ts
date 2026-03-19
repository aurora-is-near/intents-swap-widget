import { z } from 'zod';

import { feeServiceApi } from '@/network';
import type { SimpleToken } from '@/types/token';

const assetStatSchema = z.object({
  token_id: z.string(),
  blockchain: z.string(),
  symbol: z.string(),
  volume_amount_usd: z.string(),
});

const responseSchema = z.object({
  asset_stats: z.array(z.unknown()),
  tokens: z.array(z.unknown()),
});

export type FeeServiceAssetStat = {
  tokenId: string;
  blockchain: string;
  symbol: string;
  volumeAmountUsd: string;
};

export type FeeServiceTokensResponse = {
  assetStats: FeeServiceAssetStat[];
  tokens: SimpleToken[];
};

const parseAssetStat = (raw: unknown): FeeServiceAssetStat | null => {
  const result = assetStatSchema.safeParse(raw);

  if (!result.success) {
    return null;
  }

  return {
    tokenId: result.data.token_id,
    blockchain: result.data.blockchain,
    symbol: result.data.symbol,
    volumeAmountUsd: result.data.volume_amount_usd,
  };
};

export const FEE_SERVICE_TOKENS_QUERY_KEY = 'fee-service-tokens';

export const fetchFeeServiceTokens = async (
  apiKey: string,
): Promise<FeeServiceTokensResponse> => {
  const response = await feeServiceApi.get<unknown>(`/api/tokens/${apiKey}`);

  const parsed = responseSchema.safeParse(response.data);

  if (!parsed.success) {
    return { assetStats: [], tokens: [] };
  }

  const assetStats = parsed.data.asset_stats
    .map(parseAssetStat)
    .filter((s): s is FeeServiceAssetStat => s !== null);

  return {
    assetStats,
    tokens: parsed.data.tokens as SimpleToken[],
  };
};
