import { formatUnits } from 'ethers';

import type { Token, TokenBalances } from '@/types/token';
import type { Chains } from '@/types/chain';

import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';

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

const sortTokensByUsdBalance = (
  walletSupportedChains: ReadonlyArray<Chains>,
  usdBalanceA: number | undefined,
  usdBalanceB: number | undefined,
  searchStr: string | undefined,
  a: Token,
  b: Token,
): number => {
  const isIntent = a.isIntent || b.isIntent;

  // 0. Sort supported chains first
  const aSupported = walletSupportedChains.includes(a.blockchain);
  const bSupported = walletSupportedChains.includes(b.blockchain);

  if (!isIntent && aSupported && !bSupported) {
    return -1;
  }

  if (!isIntent && !aSupported && bSupported) {
    return 1;
  }

  if (!isIntent && !aSupported && !bSupported) {
    return compareWithSearch(a, b, searchStr);
  }

  // 1. Handle zero balances
  if (!usdBalanceA && !usdBalanceB) {
    return compareWithSearch(a, b, searchStr);
  }

  if (!usdBalanceA && usdBalanceB) {
    return 1;
  }

  if (!usdBalanceB && usdBalanceA) {
    return -1;
  }

  // 3. Compare non-zero balances
  if (usdBalanceA !== usdBalanceB) {
    return (usdBalanceB ?? 0) - (usdBalanceA ?? 0);
  }

  // 4. If balances equal, sort by market cap and then name
  return compareWithSearch(a, b, searchStr);
};

export const createTokenSorter = (
  tokensBalance: TokenBalances,
  walletSupportedChains: ReadonlyArray<Chains>,
  searchStr?: string | undefined,
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

    return sortTokensByUsdBalance(
      walletSupportedChains,
      usdBalanceA,
      usdBalanceB,
      searchLower,
      a,
      b,
    );
  };
};
