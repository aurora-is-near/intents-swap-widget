import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import type { Token } from '@/types/token';
import { FakeTransaction, Transaction } from '@/types/transaction';

/**
 * Finds the best display token for a transaction asset.
 */
export const findTransactionToken = (
  tokens: Token[],
  tx: Transaction | FakeTransaction,
  variant: 'source' | 'destination',
): Token | undefined => {
  const refundTo = 'refundTo' in tx ? tx.refundTo : undefined;
  const refundType = 'refundType' in tx ? tx.refundType : undefined;
  const { recipient } = tx;
  const assetId = variant === 'source' ? tx.originAsset : tx.destinationAsset;
  const isIntent =
    variant === 'source'
      ? tx.depositType === 'INTENTS'
      : tx.recipientType === 'INTENTS';

  // We can identify synthetic Aurora source tokens if the refundTo is `aurora`.
  if (refundTo === 'aurora') {
    const auroraToken = tokens.find(
      (t) =>
        t.assetId === assetId &&
        t.isIntent === (refundType !== 'ORIGIN_CHAIN') &&
        t.blockchain === 'aurora',
    );

    if (auroraToken) {
      return auroraToken;
    }
  }

  // We can identify synthetic Aurora destination tokens if the recipient is `aurora`.
  if (recipient === 'aurora') {
    const auroraToken = tokens.find(
      (t) =>
        t.assetId === assetId &&
        t.isIntent === isIntent &&
        t.blockchain === 'aurora',
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
