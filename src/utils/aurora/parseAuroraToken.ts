import type { AuroraToken } from './types';
import { evmAddressToIntentsAssetId } from './auroraAssetIdMapping';
import { CHAINS_LIST } from '@/constants/chains';
import { AURORA_TOKEN_FILTERS } from '@/constants/aurora';
import type { Token } from '@/types/token';
import { parseDecimals } from '@/utils/formatters/parseDecimals';
import { parsePrice } from '@/utils/formatters/parsePrice';

/**
 * Check if a token should be included based on filters
 */
function shouldIncludeToken(token: AuroraToken): boolean {
  // Type filter
  if (!AURORA_TOKEN_FILTERS.includedTypes.includes(token.type as any)) {
    return false;
  }

  // Market cap filter (if available)
  if (token.circulating_market_cap) {
    const marketCap = parseFloat(token.circulating_market_cap);

    if (!Number.isNaN(marketCap) && marketCap < AURORA_TOKEN_FILTERS.minMarketCap) {
      return false;
    }
  }

  // Holders filter
  if (token.holders_count < AURORA_TOKEN_FILTERS.minHolders) {
    return false;
  }

  return true;
}

/**
 * Maps Aurora Explorer token to widget Token format
 * Includes filtering, validation, and error handling
 */
export function parseAuroraToken(auroraToken: AuroraToken): Token | null {
  try {
    // Apply filters
    if (!shouldIncludeToken(auroraToken)) {
      return null;
    }

    // Validate required fields
    if (!auroraToken.symbol || !auroraToken.name || !auroraToken.address) {
      return null;
    }

    // Parse and validate decimals
    const decimals = parseDecimals(auroraToken.decimals);

    if (decimals === null) {
      return null;
    }

    // Generate AssetId with validation
    const assetId = evmAddressToIntentsAssetId(auroraToken.address);

    return {
      assetId,
      blockchain: 'aurora',
      symbol: auroraToken.symbol,
      name: auroraToken.name,
      decimals,
      icon: auroraToken.icon_url ?? '',
      chainIcon: CHAINS_LIST.aurora.icon,
      chainName: 'Aurora',
      isIntent: false,
      contractAddress: auroraToken.address,
      price: parsePrice(auroraToken.exchange_rate),
    };
  } catch (error) {
    return null;
  }
}
