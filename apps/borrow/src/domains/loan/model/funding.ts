import { parseUnits } from 'viem';

import { tokenAmountToUsd } from '@/domains/markets/utils/format';
import type {
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';
import type { FundingAsset } from '@/domains/wallet/types';

import { collateralFor } from './collateral';
import { decimalsOf, DEFAULT_PAIR, sameSymbol } from './reserveAssets';
import type { CollateralChoice } from './collateral';
import type { MarketPair } from './marketRows';
import type { ReserveAsset } from './reserveAssets';

/*
 * What the loan is funded with: the wallet balance (or, not connected, the
 * collateral picked), the typed amount, and what it is worth.
 */

/** What the Supply picker funds the loan with. */
export type Funding = {
  /** The wallet balance picked; `undefined` while not connected or none is held. */
  asset: FundingAsset | undefined;
  symbol: string;
  decimals: number;
};

/** `parseUnits` for what `AmountInput` lets through; `0n` for a partial value. */
export const toAtomic = (amount: string, decimals: number): bigint => {
  try {
    return amount === '' || amount === '.' ? 0n : parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
};

/** `amount` from `from` decimals to `to` decimals, rounded down. */
export const rescale = (amount: bigint, from: number, to: number) =>
  to >= from
    ? amount * 10n ** BigInt(to - from)
    : amount / 10n ** BigInt(from - to);

/** Dollars with 8 decimals, as the oracle's unit, for the bigint maths. */
const USD_SCALE = 100_000_000;

/**
 * The funding: a held balance when connected (the pick, else the most
 * valuable one that can fund a loan); the collateral picked, or the
 * default, otherwise. Its decimals are the balance's, else the collateral
 * reserve's, else 18.
 */
export const pickFunding = ({
  connected,
  rows,
  fundingId,
  collateralPick,
  collateralAssets,
}: {
  connected: boolean;
  /** The wallet's balance rows, most valuable first. */
  rows: readonly FundingAsset[];
  /** The balance picked (by asset id), when connected. */
  fundingId: string | undefined;
  /** The collateral symbol picked, when not connected. */
  collateralPick: string | undefined;
  collateralAssets: readonly ReserveAsset[];
}): Funding => {
  const available = rows.filter(
    ({ unavailableReason }) => unavailableReason === undefined,
  );

  const held = connected
    ? (available.find(({ assetId }) => assetId === fundingId) ?? available[0])
    : undefined;

  const symbol =
    held?.symbol ??
    (connected ? undefined : collateralPick) ??
    DEFAULT_PAIR.collateral;

  return {
    asset: held,
    symbol,
    decimals: held?.decimals ?? decimalsOf(collateralAssets, symbol, 18),
  };
};

/**
 * The typed amount in dollars. A wallet balance is priced by 1Click (its
 * USD value over its amount); with no balance or no 1Click price, a held
 * asset supplied as itself falls back to the collateral's oracle price.
 */
const amountInUsd = ({
  atomic,
  funding,
  reserve,
  converted,
  baseCurrencyUnit,
}: {
  atomic: bigint;
  funding: Funding;
  reserve: CollateralReserve | undefined;
  converted: boolean;
  baseCurrencyUnit: bigint | undefined;
}): number | undefined => {
  const { asset } = funding;

  if (asset?.usdValue !== undefined && asset.amount > 0n) {
    return (asset.usdValue * Number(atomic)) / Number(asset.amount);
  }

  if (converted || !reserve || baseCurrencyUnit === undefined) {
    return undefined;
  }

  return tokenAmountToUsd({
    amount: rescale(atomic, funding.decimals, reserve.decimals),
    decimals: reserve.decimals,
    priceBase: reserve.priceBase,
    baseCurrencyUnit,
  });
};

/**
 * How the funding is supplied in `snapshot`'s market (`choice`), whether it
 * is converted first, and the typed amount in dollars there. Before a market
 * is known, the pair already says whether it converts (ETH counting as
 * WETH).
 */
export const supplyIn = ({
  snapshot,
  funding,
  pair,
  atomic,
}: {
  snapshot: MarketSnapshot | undefined;
  funding: Funding;
  pair: MarketPair;
  atomic: bigint;
}): {
  choice: CollateralChoice | undefined;
  converted: boolean;
  amountUsd: number | undefined;
} => {
  const choice = snapshot ? collateralFor(funding.symbol, snapshot) : undefined;

  const converted = choice
    ? choice.convertedFrom !== undefined
    : !sameSymbol(pair.collateral, funding.symbol) &&
      !(
        sameSymbol(funding.symbol, 'ETH') && sameSymbol(pair.collateral, 'WETH')
      );

  const amountUsd =
    atomic > 0n
      ? amountInUsd({
          atomic,
          funding,
          reserve: choice?.reserve,
          converted,
          baseCurrencyUnit: snapshot?.baseCurrencyUnit,
        })
      : 0;

  return { choice, converted, amountUsd };
};

/**
 * The collateral amount, in the reserve's units: the typed amount when the
 * asset is supplied as itself; when it is converted, its 1Click dollar value
 * at the collateral's oracle price (an estimate until a quote).
 */
export const collateralAmountOf = ({
  atomic,
  funding,
  reserve,
  converted,
  amountUsd,
  baseCurrencyUnit,
}: {
  atomic: bigint;
  funding: Funding;
  reserve: CollateralReserve;
  converted: boolean;
  amountUsd: number | undefined;
  baseCurrencyUnit: bigint;
}): bigint => {
  if (!converted) {
    return rescale(atomic, funding.decimals, reserve.decimals);
  }

  if (amountUsd === undefined || reserve.priceBase <= 0n) {
    return 0n;
  }

  return (
    (BigInt(Math.floor(amountUsd * USD_SCALE)) *
      10n ** BigInt(reserve.decimals) *
      baseCurrencyUnit) /
    (BigInt(USD_SCALE) * reserve.priceBase)
  );
};
