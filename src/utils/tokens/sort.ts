import { formatUnits } from 'ethers';

import type { Token, TokenBalances } from '@/types/token';
import type { Chains } from '@/types/chain';

import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';

const sortDefault = (a: Token, b: Token): number => {
  if (a.isIntent && !b.isIntent) {
    return -1;
  }

  if (!a.isIntent && b.isIntent) {
    return 1;
  }

  return a.name?.localeCompare(b.name);
};

const sortTokensByUsdBalance = (
  walletSupportedChains: ReadonlyArray<Chains>,
  usdBalanceA: number | undefined,
  usdBalanceB: number | undefined,
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
    return sortDefault(a, b);
  }

  // 1. Handle undefined balances
  if (usdBalanceA === undefined && usdBalanceB === undefined) {
    return sortDefault(a, b);
  }

  if (usdBalanceA === undefined) {
    return 1;
  }

  if (usdBalanceB === undefined) {
    return -1;
  }

  // 2. Handle zero balances
  if (usdBalanceA === 0 && usdBalanceB === 0) {
    return sortDefault(a, b);
  }

  if (usdBalanceA === 0 && usdBalanceB > 0) {
    return 1;
  }

  if (usdBalanceB === 0 && usdBalanceA > 0) {
    return -1;
  }

  // 3. Compare non-zero balances
  if (usdBalanceA !== usdBalanceB) {
    return usdBalanceB - usdBalanceA;
  }

  // 4. If balances equal, sort by market cap and then name
  return sortDefault(a, b);
};

export const createTokenSorter = (
  tokensBalance: TokenBalances,
  walletSupportedChains: ReadonlyArray<Chains>,
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

    return sortTokensByUsdBalance(
      walletSupportedChains,
      usdBalanceA,
      usdBalanceB,
      a,
      b,
    );
  };
};
