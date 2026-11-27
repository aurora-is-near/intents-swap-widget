import type { LendingMarket } from '@/domains/markets/types';
import type { FundingAssets } from '@/domains/wallet/types';

import { decimalsOf } from './reserveAssets';
import type { BorrowRequest } from './borrowRequest';
import type { CtaState } from './ctaState';
import type { Funding } from './funding';
import type { LoanFigures } from './loanFigures';
import type { LoanInMarket } from './loanInMarket';
import type { MarketPair } from './marketRows';
import type { ReserveAsset } from './reserveAssets';

/*
 * The New loan form's shape (`useLoanForm`'s result), and the small
 * derivations the hook makes for it from the loan model.
 */

/** What `useLoanForm` gives the form. */
export type LoanForm = {
  connected: boolean;
  /** The wallet's balances; empty rows while not connected. */
  fundingAssets: FundingAssets;
  funding: Funding;
  /** Picks a wallet balance (by asset id) or, not connected, a collateral symbol. */
  pickFunding: (id: string) => void;
  /**
   * The collateral reserves across the markets, for the picker while not
   * connected; those `comingSoon` last.
   */
  collateralAssets: ReserveAsset[];

  /** The amount as typed, in the funding asset. */
  amount: string;
  setAmount: (amount: string) => void;
  /** The typed amount in dollars; `undefined` when there is no price for it. */
  amountUsd: number | undefined;

  /** The collateral the funding asset is supplied as, in the selected market. */
  collateral: { symbol: string; decimals: number; convertedFrom?: string };

  /**
   * The borrowable reserves across the markets, less the collateral's
   * symbol; those `comingSoon` last.
   */
  borrowAssets: ReserveAsset[];
  borrow: { symbol: string; decimals: number };
  setBorrowSymbol: (symbol: string) => void;

  /** Loan-to-value in whole percent. */
  ltv: number;
  setLtv: (ltv: number) => void;

  /** The collateral and borrow symbols the market list is read for. */
  pair: MarketPair;
  /**
   * The loan's size in dollars (the collateral's value × the LTV), read
   * without the chosen chain, which it helps choose; `undefined` with no
   * amount or no price for it. The market list takes it to choose the same
   * chains.
   */
  loanUsd: number | undefined;
  /**
   * The selected market, one provider on one chain: the provider
   * `marketFit` gives (the user's pick if it fits, else BEST) on its chosen
   * chain, chosen again as the pair, the amount or the LTV change;
   * `undefined` when the LTV fits no provider. Until every market has
   * settled, only a fitting pick, as the market list does.
   */
  market: LendingMarket | undefined;
  /**
   * The market the figures and the liquidation marker are read for: the
   * selection, or, when the LTV fits no provider, the first provider's
   * chosen chain, as the artboard's `|| M[0]` (line 1143). Not a selection.
   * `undefined` while the markets load and nothing is picked.
   */
  figuresMarket: LendingMarket | undefined;
  /** `figuresMarket`'s liquidation LTV for the pair, in bps. */
  liquidationLtvBps: number | undefined;
  /**
   * The providers (`LendingMarket.provider`) the LTV is above the max LTV
   * of: shown off, not pickable.
   */
  disabledMarketIds: string[];
  /**
   * Keeps the picked provider (`LendingMarket.provider`); while it does not
   * fit the LTV, the selection is BEST.
   */
  pickMarket: (provider: string) => void;

  /** The box is ticked, or the recipient is required. */
  recipientEnabled: boolean;
  /**
   * Turning it off also clears the recipient. Ignored while the recipient
   * is required.
   */
  setRecipientEnabled: (enabled: boolean) => void;
  /**
   * The connected wallet is not EVM, so it can't receive the borrowed funds
   * on the market's chain: the box is on and locked, and the call to action
   * waits for a valid address.
   */
  recipientRequired: boolean;
  recipient: string;
  setRecipient: (recipient: string) => void;

  /** The loan in `figuresMarket`; `undefined` until a market has the pair. */
  figures: LoanFigures | undefined;
  /**
   * `figures.liquidationPrice` in dollars per whole collateral token;
   * `undefined` with no amount, no borrow or no market.
   */
  liquidationPriceUsd: number | undefined;

  /** The call to action's state. */
  cta: CtaState;
  /**
   * The loan to borrow while the call to action is ready: a held balance,
   * the selected market and its reserves; `undefined` otherwise.
   */
  borrowRequest: BorrowRequest | undefined;
};

/** The funding while no wallet is connected. */
export const NOT_CONNECTED_FUNDING: Omit<FundingAssets, 'refresh'> = {
  rows: [],
  unreadChains: [],
  status: 'idle',
};

/**
 * The held balance. No held row means a zero balance only once the balances
 * have been read; while they load or after a failed read, it is unknown.
 */
export const balanceOf = (
  funding: Funding,
  status: FundingAssets['status'],
): bigint | undefined =>
  funding.asset?.amount ?? (status === 'ready' ? 0n : undefined);

/** The borrow's decimals: the figures' market's reserve, else the picker's. */
export const borrowDecimalsOf = (
  { borrowReserve }: LoanInMarket,
  borrowAsset: ReserveAsset | undefined,
): number => borrowReserve?.decimals ?? borrowAsset?.decimals ?? 6;

/** The collateral as supplied in the figures' market, else as listed. */
export const collateralOf = (
  { choice, converted }: LoanInMarket,
  {
    funding,
    pair,
    collateralAssets,
  }: {
    funding: Funding;
    pair: MarketPair;
    collateralAssets: readonly ReserveAsset[];
  },
): LoanForm['collateral'] => ({
  symbol: pair.collateral,
  decimals:
    choice?.reserve.decimals ??
    decimalsOf(collateralAssets, pair.collateral, 18),
  convertedFrom: converted ? funding.symbol : undefined,
});
