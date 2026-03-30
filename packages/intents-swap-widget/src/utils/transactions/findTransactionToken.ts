import type { Token } from '@/types/token';

/**
 * Finds the best display token for a transaction asset.
 *
 * Intents transactions use NEAR-wrapped assetIds (e.g. nep141:eth.bridge.near),
 * so a plain `find` by assetId returns a token with `blockchain: "near"` and
 * renders a misleading NEAR chain badge.
 *
 * When the matched token is on NEAR but the same symbol exists on another chain
 * (i.e. it's a wrapped version of a non-NEAR token), we return the intent
 * variant instead — which hides the chain badge in TokenIcon.
 *
 * Chain-native tokens (e.g. USDC on Base in a deposit) keep their original
 * chain badge because the assetId already maps to the correct blockchain.
 */
export const findTransactionToken = (
  tokens: Token[],
  assetId: string,
): Token | undefined => {
  const match = tokens.find((t) => t.assetId === assetId && !t.isIntent);

  if (!match) {
    const tokenByAssetId = tokens.find((t) => t.assetId === assetId);

    if (tokenByAssetId) {
      return tokenByAssetId;
    }

    // Some tokens changed their asset ID on intents side to multi token
    // which means nep141 is now nep245
    if (assetId.startsWith('nep141:')) {
      const nep245AssetId = assetId.replace('nep141:', 'nep245:');

      return tokens.find((t) => t.assetId === nep245AssetId);
    }

    return undefined;
  }

  // Token is not on NEAR — the chain badge is already correct
  if (match.blockchain !== 'near') {
    return match;
  }

  // Token IS on NEAR — check if it's a wrapped version of a non-NEAR token
  const hasNonNearVariant = tokens.some(
    (t) => t.symbol === match.symbol && !t.isIntent && t.blockchain !== 'near',
  );

  // If a non-NEAR variant exists, this is a wrapped token — use the intent
  // version so TokenIcon hides the misleading NEAR badge
  if (hasNonNearVariant) {
    return tokens.find((t) => t.assetId === assetId && t.isIntent) ?? match;
  }

  // Genuinely a NEAR-native token (e.g. NEAR itself) — keep the NEAR badge
  return match;
};
