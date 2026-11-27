import type { TokenOption } from '@aurora-is-near/ui-kit';

import type { FundingAsset } from '@/domains/wallet/types';

import { chainOf } from '../../utils/chains';
import {
  formatAmount,
  toDisplayNumber,
  USD_CENTS,
  USD_ROUND,
} from '../../utils/loanFormat';
import type { ReserveAsset } from '../../model/reserveAssets';

/**
 * Token marks by symbol: the artboard's letters and colours (lines
 * 1103–1124); WETH takes ETH's colours. Others: two letters on `sf2`.
 */
const MARKS: Record<string, { label: string; bg: string; fg: string }> = {
  wsteth: { label: 'ws', bg: '#BFE3FF', fg: '#0B3350' },
  eth: { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
  weth: { label: 'WE', bg: '#DAD9F7', fg: '#25235C' },
  weeth: { label: 'we', bg: '#E3D4F7', fg: '#3B1F63' },
  reth: { label: 'rE', bg: '#FFD9B8', fg: '#5B2A05' },
  wbtc: { label: 'WB', bg: '#FFE2A8', fg: '#4A3000' },
  cbbtc: { label: 'cb', bg: '#C9D7FF', fg: '#14275E' },
  susds: { label: 'sU', bg: '#FFD0E4', fg: '#5E0B33' },
  usds: { label: 'US', bg: '#D3F2DF', fg: '#0C4325' },
  usdc: { label: 'UC', bg: '#C7E0FF', fg: '#0B2E5C' },
  dai: { label: 'DA', bg: '#FFE9A8', fg: '#4A3800' },
  usdt: { label: 'UT', bg: '#C6EBDD', fg: '#0B4033' },
  gho: { label: 'GH', bg: '#E5D3FF', fg: '#3A1B66' },
};

export const markOf = (symbol: string): TokenOption['mark'] =>
  MARKS[symbol.toLowerCase()] ?? {
    label: symbol.slice(0, 2),
    bg: 'var(--sf2)',
    fg: 'var(--ink)',
  };

/** The group chips (line 1162), "Stocks" left out: Borrow lists none. */
export const GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'eth', label: 'ETH' },
  { id: 'btc', label: 'BTC' },
  { id: 'stable', label: 'Stables' },
] as const;

type Group = (typeof GROUPS)[number]['id'];

/** A token's group by its symbol: wstETH is ETH, cbBTC is BTC, USDC a stable. */
export const groupOf = (symbol: string): Group | undefined => {
  if (/btc/i.test(symbol)) {
    return 'btc';
  }

  if (/eth/i.test(symbol)) {
    return 'eth';
  }

  return /usd|dai|gho|eur|frax/i.test(symbol) ? 'stable' : undefined;
};

export const ALL = 'all';

/**
 * One wallet balance as a picker row: its chain, balance and USD value. The
 * balance is the number alone: the row already names the token, and the
 * room goes to the name beside it.
 */
export const fundingOption = (asset: FundingAsset): TokenOption => ({
  id: asset.assetId,
  symbol: asset.symbol,
  mark: markOf(asset.symbol),
  chainsLabel: chainOf(asset.chain).name,
  priceLabel: '',
  balanceLabel: formatAmount(toDisplayNumber(asset.amount, asset.decimals)),
  balanceUsdLabel:
    asset.usdValue === undefined
      ? undefined
      : `$${USD_CENTS.format(asset.usdValue)}`,
  unavailableReason: asset.unavailableReason,
});

/**
 * A reserve as a picker row: the chains of its markets and its price;
 * disabled, "Coming soon", when the borrow action does not cover it yet.
 * The artboards draw no such row, so it takes the funding picker's
 * disabled-with-reason treatment ("Not supported yet").
 */
export const reserveOption = (asset: ReserveAsset): TokenOption => ({
  id: asset.symbol,
  symbol: asset.symbol,
  mark: markOf(asset.symbol),
  chainsLabel: asset.markets.map(({ chainLabel }) => chainLabel).join(' · '),
  priceLabel: `$${(asset.priceUsd > 10 ? USD_ROUND : USD_CENTS).format(asset.priceUsd)}`,
  unavailableReason: asset.comingSoon ? 'Coming soon' : undefined,
});

export type FilterValue = { group: Group; chain: string };

export const ALL_FILTERS: FilterValue = { group: ALL, chain: ALL };

export const passes = (filter: FilterValue, symbol: string, chains: string[]) =>
  (filter.group === ALL || groupOf(symbol) === filter.group) &&
  (filter.chain === ALL || chains.includes(filter.chain));

export const unique = (values: readonly string[]) => [...new Set(values)];
