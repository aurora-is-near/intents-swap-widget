import type { Token } from '@/types/token';

/**
 * Finds the best display token for a transaction asset.
 */
export const findTransactionToken = (
  tokens: Token[],
  assetId: string,
  isIntent: boolean,
): Token | undefined => {
  const match = tokens.find(
    (t) => t.assetId === assetId && t.isIntent === isIntent,
  );

  if (match) {
    return match;
  }

  // Some tokens changed their asset ID on intents side to multi token
  // which means nep141 is now nep245
  if (assetId.startsWith('nep141:')) {
    const nep245AssetId = assetId.replace('nep141:', 'nep245:');

    return tokens.find((t) => t.assetId === nep245AssetId);
  }

  return undefined;
};
