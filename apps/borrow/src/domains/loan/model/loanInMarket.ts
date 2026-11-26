import { baseToUsd } from '@/domains/markets/utils/format';
import type { BorrowReserve, MarketSnapshot } from '@/domains/markets/types';

import { collateralAmountOf, supplyIn } from './funding';
import { loanFigures } from './loanFigures';
import { sameSymbol } from './reserveAssets';
import type { CollateralChoice } from './collateral';
import type { Funding } from './funding';
import type { LoanFigures } from './loanFigures';
import type { MarketPair } from './marketRows';

/*
 * The loan read in one market's snapshot: its size, which chooses the
 * chains, and its figures in the market they are shown for.
 */

type LoanInput = {
  snapshot: MarketSnapshot | undefined;
  funding: Funding;
  pair: MarketPair;
  /** The typed amount, in the funding asset's units. */
  atomic: bigint;
  /** Loan-to-value in whole percent. */
  ltv: number;
};

/**
 * The loan's size in dollars (the collateral's value × the LTV) in
 * `snapshot`'s market: a 1Click price when there is one, else that
 * market's oracle. `undefined` with no amount or no price for it.
 */
export const loanSizeUsd = ({
  snapshot,
  funding,
  pair,
  atomic,
  ltv,
}: LoanInput): number | undefined => {
  const { amountUsd } = supplyIn({ snapshot, funding, pair, atomic });

  return atomic > 0n && amountUsd !== undefined
    ? (amountUsd * ltv) / 100
    : undefined;
};

/** The loan in one market: how it is supplied, and what it borrows. */
export type LoanInMarket = {
  choice: CollateralChoice | undefined;
  converted: boolean;
  amountUsd: number | undefined;
  /** The market's reserve of the pair's borrow symbol. */
  borrowReserve: BorrowReserve | undefined;
  /** `undefined` until the market has the pair. */
  figures: LoanFigures | undefined;
  /**
   * `figures.liquidationPrice` in dollars per whole collateral token;
   * `undefined` with no figures or no liquidation price.
   */
  liquidationPriceUsd: number | undefined;
};

/** `figures`' liquidation price in dollars, at `snapshot`'s oracle unit. */
const liquidationPriceUsdOf = (
  figures: LoanFigures | undefined,
  snapshot: MarketSnapshot,
) =>
  figures && figures.liquidationPrice !== null
    ? baseToUsd(figures.liquidationPrice, snapshot.baseCurrencyUnit)
    : undefined;

/**
 * The loan in `snapshot`'s market (the figures' market): the collateral it
 * is supplied as, the pair's borrow reserve, and the loan figures once the
 * market has both.
 */
export const loanInMarket = ({
  snapshot,
  funding,
  pair,
  atomic,
  ltv,
}: LoanInput): LoanInMarket => {
  const supply = supplyIn({ snapshot, funding, pair, atomic });

  if (!snapshot) {
    return {
      ...supply,
      borrowReserve: undefined,
      figures: undefined,
      liquidationPriceUsd: undefined,
    };
  }

  const { choice, converted, amountUsd } = supply;
  const borrowReserve = snapshot.borrowable.find(({ symbol }) =>
    sameSymbol(symbol, pair.borrow),
  );

  const figures =
    choice && borrowReserve
      ? loanFigures({
          collateralAmount: collateralAmountOf({
            atomic,
            funding,
            reserve: choice.reserve,
            converted,
            amountUsd,
            baseCurrencyUnit: snapshot.baseCurrencyUnit,
          }),
          collateral: choice.reserve,
          borrow: borrowReserve,
          ltv,
        })
      : undefined;

  return {
    ...supply,
    borrowReserve,
    figures,
    liquidationPriceUsd: liquidationPriceUsdOf(figures, snapshot),
  };
};
