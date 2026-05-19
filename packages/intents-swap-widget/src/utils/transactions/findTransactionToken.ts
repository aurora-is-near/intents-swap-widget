import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import type { Token } from '@/types/token';

/**
 * Finds the best display token for a transaction asset.
 */
export const findTransactionToken = (
  tokens: Token[],
  assetId: string,
  isIntent: boolean,
  {
    recipient,
    refundTo,
  }: {
    recipient?: string;
    refundTo?: string;
  } = {},
): Token | undefined => {
  // We can identify synthetic Aurora tokens if the recipient or refundTo is
  // `aurora`.
  if (recipient === 'aurora' || refundTo === 'aurora') {
    const auroraToken = tokens.find(
      (t) => t.assetId === assetId && !t.isIntent && t.blockchain === 'aurora',
    );

    if (auroraToken) {
      return auroraToken;
    }
  }

  // wNEAR is stripped from the non-intents token list in favour of native NEAR,
  // so the only remaining non-intent match for wrap.near is the synthetic
  // Aurora variant, which would render the wrong chain badge. Map it back to
  // native NEAR, matching how wNEAR is presented elsewhere.
  if (!isIntent && assetId === WNEAR_ASSET_ID) {
    const nativeNear = tokens.find(
      (t) => t.assetId === NATIVE_NEAR_DUMB_ASSET_ID && !t.isIntent,
    );

    if (nativeNear) {
      return nativeNear;
    }
  }

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
