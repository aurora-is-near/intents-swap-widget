import type { Token } from '@/types/token';
import type { Chains } from '@/types/chain';

/**
 * Check if the chain is Aurora
 */
export function isAuroraChain(chain: Chains | string): boolean {
  return chain === 'aurora';
}

/**
 * Check if a token is from Aurora chain
 */
export function isAuroraToken(token: Token): boolean {
  return token.blockchain === 'aurora';
}

/**
 * Check if an AssetId is for an Aurora token
 * @param assetId - AssetId to check
 * @returns true if it's an Aurora AssetId (format: nep141:{address}.factory.bridge.near)
 */
export function isAuroraAssetId(assetId: string): boolean {
  if (!assetId) {
    return false;
  }

  // Match pattern: nep141:{40_hex_chars}.factory.bridge.near
  const pattern = /^nep141:[a-f0-9]{40}\.factory\.bridge\.near$/i;

  return pattern.test(assetId);
}
