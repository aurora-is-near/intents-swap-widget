import { formatUnits } from 'ethers';

import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';
import type { Token, TokenBalances } from '@/types/token';
import type { PriorityAssets } from '@/types/config';
import type { Chains } from '@/types/chain';

const compareByPriority = (
  a: Token,
  b: Token,
  priorityAssets: PriorityAssets,
): number | null => {
  if (a.isIntent || b.isIntent || priorityAssets.length === 0) {
    return null;
  }

  const isPriorityToken = (token: Token): boolean => {
    // by assetId
    if (typeof priorityAssets[0] === 'string') {
      return (priorityAssets as ReadonlyArray<string>).includes(token.assetId);
    }

    // by blockchain and symbol
    return (priorityAssets as ReadonlyArray<readonly [Chains, string]>).some(
      ([blockchain, symbol]) =>
        token.blockchain === blockchain &&
        token.symbol.toLowerCase() === symbol.toLowerCase(),
    );
  };

  const getPriorityIndex = (token: Token): number => {
    // by assetId
    if (typeof priorityAssets[0] === 'string') {
      return (priorityAssets as ReadonlyArray<string>).indexOf(token.assetId);
    }

    // by blockchain and symbol
    return (
      priorityAssets as ReadonlyArray<readonly [Chains, string]>
    ).findIndex(
      ([blockchain, symbol]) =>
        token.blockchain === blockchain &&
        token.symbol.toLowerCase() === symbol.toLowerCase(),
    );
  };

  const aIsPriority = isPriorityToken(a);
  const bIsPriority = isPriorityToken(b);

  if (aIsPriority && !bIsPriority) {
    return -1;
  }

  if (!aIsPriority && bIsPriority) {
    return 1;
  }

  // If both are priority tokens, maintain their relative order based on the priority list
  if (aIsPriority && bIsPriority) {
    const aIndex = getPriorityIndex(a);
    const bIndex = getPriorityIndex(b);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
  }

  // Return null to indicate no priority difference, continue with other sorting criteria
  return null;
};

const compareWithSearch = (
  a: Token,
  b: Token,
  searchLower: string | undefined,
): number => {
  if (a.isIntent && !b.isIntent) {
    return -1;
  }

  if (!a.isIntent && b.isIntent) {
    return 1;
  }

  // sort alphabetically if no search
  if (!searchLower) {
    const symbolCompare = (a.symbol ?? '').localeCompare(
      b.symbol ?? '',
      undefined,
      {
        sensitivity: 'base',
      },
    );

    if (symbolCompare !== 0) {
      return symbolCompare;
    }

    return a.chainName.localeCompare(b.chainName, undefined, {
      sensitivity: 'base',
    });
  }

  const getSymbolRank = (symbol: string) => {
    if (symbol === searchLower) {
      return 0;
    }

    if (symbol.startsWith(searchLower)) {
      return 1;
    }

    if (symbol.includes(searchLower)) {
      return 2;
    }

    return 3;
  };

  const symbolRankA = getSymbolRank(a.symbol.toLowerCase());
  const symbolRankB = getSymbolRank(b.symbol.toLowerCase());

  // First compare by symbol match rank
  if (symbolRankA !== symbolRankB) {
    return symbolRankA - symbolRankB;
  }

  // Then compare alphabetically by symbol
  const symbolCompare = a.symbol
    .toLowerCase()
    .localeCompare(b.symbol.toLowerCase());

  if (symbolCompare !== 0) {
    return symbolCompare;
  }

  // Finally compare by blockchain
  return a.chainName.toLowerCase().localeCompare(b.chainName.toLowerCase());
};

const sortTokens = (
  supportedChains: ReadonlyArray<Chains>,
  priorityAssets: PriorityAssets,
  usdBalanceA: number | undefined,
  usdBalanceB: number | undefined,
  searchStr: string | undefined,
  a: Token,
  b: Token,
): number => {
  const isIntent = a.isIntent || b.isIntent;
  const hasBalanceA = usdBalanceA !== undefined && usdBalanceA > 0;
  const hasBalanceB = usdBalanceB !== undefined && usdBalanceB > 0;

  // 1. Tokens with balance always come first
  if (hasBalanceA && !hasBalanceB) {
    return -1;
  }

  if (!hasBalanceA && hasBalanceB) {
    return 1;
  }

  // 2. If both have balance, sort by balance amount and other criteria
  if (hasBalanceA && hasBalanceB) {
    // Sort supported chains first
    const aSupported = supportedChains.includes(a.blockchain);
    const bSupported = supportedChains.includes(b.blockchain);

    if (!isIntent && aSupported && !bSupported) {
      return -1;
    }

    if (!isIntent && !aSupported && bSupported) {
      return 1;
    }

    // Compare non-zero balances
    if (usdBalanceA !== usdBalanceB) {
      return (usdBalanceB ?? 0) - (usdBalanceA ?? 0);
    }

    // If balances equal, sort by search/name
    return compareWithSearch(a, b, searchStr);
  }

  // 3. Both have no balance - prioritize by asset IDs or blockchain-symbol pairs (only for non-intent tokens)
  const priorityComparison = compareByPriority(a, b, priorityAssets);

  if (priorityComparison !== null) {
    return priorityComparison;
  }

  // 4. For tokens without balance and not in priority list, sort by supported chains
  const aSupported = supportedChains.includes(a.blockchain);
  const bSupported = supportedChains.includes(b.blockchain);

  if (!isIntent && aSupported && !bSupported) {
    return -1;
  }

  if (!isIntent && !aSupported && bSupported) {
    return 1;
  }

  // 5. Finally, sort alphabetically by search/name
  return compareWithSearch(a, b, searchStr);
};

export const createTokenSorter = (
  tokensBalance: TokenBalances,
  supportedChains: ReadonlyArray<Chains>,
  searchStr?: string | undefined,
  priorityAssets: PriorityAssets = [],
) => {
  return (a: Token, b: Token) => {
    const recordA = tokensBalance[getTokenBalanceKey(a)];
    const recordB = tokensBalance[getTokenBalanceKey(b)];

    const balanceA = recordA ? formatUnits(recordA, a.decimals) : '0';
    const balanceB = recordB ? formatUnits(recordB, b.decimals) : '0';

    const usdBalanceA =
      recordA !== undefined
        ? parseFloat(`${balanceA ?? 0}`) * a.price
        : undefined;

    const usdBalanceB =
      recordB !== undefined
        ? parseFloat(`${balanceB ?? 0}`) * b.price
        : undefined;

    const searchLower = searchStr?.trim().toLowerCase() ?? undefined;

    return sortTokens(
      supportedChains,
      priorityAssets,
      usdBalanceA,
      usdBalanceB,
      searchLower,
      a,
      b,
    );
  };
};
