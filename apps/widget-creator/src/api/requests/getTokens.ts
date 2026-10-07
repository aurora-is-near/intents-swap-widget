import { z } from 'zod';

import { feeServiceClient } from '../network';

const tokenSchema = z.object({
  assetId: z.string(),
  decimals: z.number(),
  blockchain: z.string(),
  symbol: z.string(),
  price: z.number(),
  contractAddress: z.string().optional(),
});

const tokensResponseSchema = z.object({
  tokens: z.array(z.unknown()),
});

export type FeeServiceToken = z.infer<typeof tokenSchema>;

// Same token list the widget itself loads for the given API key.
export const getTokens = async (apiKey: string): Promise<FeeServiceToken[]> => {
  const { data } = await feeServiceClient.get<unknown>(`/tokens/${apiKey}`);

  // Drop malformed entries instead of failing the whole list.
  return tokensResponseSchema
    .parse(data)
    .tokens.map((token) => tokenSchema.safeParse(token))
    .filter((result) => result.success)
    .map((result) => result.data);
};
