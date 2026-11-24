import { useState } from 'react';
import { type Address, parseUnits } from 'viem';

import type { FundingAsset } from '../balances/toFundingAssets';
import {
  type FundingAssets,
  useFundingAssets,
} from '../balances/useFundingAssets';
import { tokenAmountToUsd } from '../markets/format';
import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  MarketSnapshot,
} from '../markets/types';
import { useMarketSnapshots } from '../markets/useMarketSnapshots';
import { type MarketPair, type MarketRow, pairRow } from './marketRows';
import { collateralFor } from './model/collateral';
import { type CtaState, ctaState } from './model/ctaState';
import { type LoanFigures, loanFigures } from './model/loanFigures';
import { marketFit } from './model/marketFit';
import { validateRecipient } from './model/recipient';
import { sameSymbol } from './model/symbols';

/**
 * The pair the form starts on, and what the pickers show while the wallet is
 * not connected: WETH collateral and USDC borrow. The artboard's default is
 * wstETH (line 1052), but 1Click does not deliver wstETH on Base or
 * Arbitrum; WETH is delivered on both and is Aave collateral on both
 * (decided in the feature review).
 */
const DEFAULT_PAIR: MarketPair = { collateral: 'WETH', borrow: 'USDC' };

/** The slider's starting loan-to-value, in whole percent (line 1053). */
const DEFAULT_LTV = 50;

/**
 * One token a picker offers from the market snapshots: a collateral or a
 * borrowable reserve, once per symbol, with the markets that list it.
 */
export type ReserveAsset = {
  symbol: string;
  decimals: number;
  /** The markets listing it, in snapshot order. */
  markets: LendingMarket[];
  /** One whole token in dollars, from the first listing market's oracle. */
  priceUsd: number;
};

/** What the Supply picker funds the loan with. */
type Funding = {
  /** The wallet balance picked; `undefined` while not connected or none is held. */
  asset: FundingAsset | undefined;
  symbol: string;
  decimals: number;
};

export type LoanForm = {
  connected: boolean;
  /** The wallet's balances; empty rows while not connected. */
  fundingAssets: FundingAssets;
  funding: Funding;
  /** Picks a wallet balance (by asset id) or, not connected, a collateral symbol. */
  pickFunding: (id: string) => void;
  /** The collateral reserves across the markets, for the picker while not connected. */
  collateralAssets: ReserveAsset[];

  /** The amount as typed, in the funding asset. */
  amount: string;
  setAmount: (amount: string) => void;
  /** The typed amount in dollars; `undefined` when there is no price for it. */
  amountUsd: number | undefined;

  /** The collateral the funding asset is supplied as, in the selected market. */
  collateral: { symbol: string; convertedFrom?: string };

  /** The borrowable reserves across the markets, less the collateral's symbol. */
  borrowAssets: ReserveAsset[];
  borrow: { symbol: string; decimals: number };
  setBorrowSymbol: (symbol: string) => void;

  /** Loan-to-value in whole percent. */
  ltv: number;
  setLtv: (ltv: number) => void;

  /** The collateral and borrow symbols the market list is read for. */
  pair: MarketPair;
  marketRows: MarketRow[];
  /**
   * The selected market, as `marketFit` gives it: the user's pick if it
   * fits, else BEST; `undefined` when the LTV fits no market. Until every
   * market has settled, only a fitting pick, as the market list does.
   */
  market: LendingMarket | undefined;
  /**
   * The market the figures and the liquidation marker are read for: the
   * selection, or, when the LTV fits no market, the first market with the
   * pair, as the artboard's `|| M[0]` (line 1143). Not a selection.
   * `undefined` while the markets load and nothing is picked.
   */
  figuresMarket: LendingMarket | undefined;
  /** `figuresMarket`'s liquidation LTV for the pair, in bps. */
  liquidationLtvBps: number | undefined;
  /** The markets the LTV is above the max LTV of: shown off, not pickable. */
  disabledMarketIds: string[];
  /** True once every market's read has settled (loaded or failed). */
  marketsSettled: boolean;
  /** Keeps the pick; while it does not fit the LTV, the selection is BEST. */
  pickMarket: (marketId: string) => void;

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
  /**
   * What the borrow plan sends the funds to (`params.recipient`): the valid
   * address while the box is on, else `undefined` (the connected wallet).
   */
  recipientAddress: Address | undefined;

  /** The loan in `figuresMarket`; `undefined` until a market has the pair. */
  figures: LoanFigures | undefined;
  /**
   * `figures.liquidationPrice` in dollars per whole collateral token;
   * `undefined` with no amount, no borrow or no market.
   */
  liquidationPriceUsd: number | undefined;

  /** The call to action's state. */
  cta: CtaState;
};

/** `parseUnits` for what `AmountInput` lets through; `0n` for a partial value. */
const toAtomic = (amount: string, decimals: number): bigint => {
  try {
    return amount === '' || amount === '.' ? 0n : parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
};

/** `amount` from `from` decimals to `to` decimals, rounded down. */
const rescale = (amount: bigint, from: number, to: number) =>
  to >= from
    ? amount * 10n ** BigInt(to - from)
    : amount / 10n ** BigInt(from - to);

/** An amount in the oracle's base units in dollars, `unit` being one dollar. */
const baseToUsd = (value: bigint, unit: bigint) =>
  Number(value / unit) + Number(value % unit) / Number(unit);

/** Dollars with 8 decimals, as the oracle's unit, for the bigint maths. */
const USD_SCALE = 100_000_000;

/**
 * The reserves of one kind across the snapshots, once per symbol (matched in
 * any case), skipping those that cannot take a new loan now.
 */
const reserveAssets = (
  snapshots: readonly MarketSnapshot[],
  reservesOf: (
    snapshot: MarketSnapshot,
  ) => readonly (CollateralReserve | BorrowReserve)[],
): ReserveAsset[] =>
  snapshots.reduce<ReserveAsset[]>((assets, snapshot) => {
    reservesOf(snapshot).forEach((reserve) => {
      if (reserve.unavailable === true) {
        return;
      }

      const known = assets.find(({ symbol }) =>
        sameSymbol(symbol, reserve.symbol),
      );

      if (known) {
        known.markets.push(snapshot.market);

        return;
      }

      assets.push({
        symbol: reserve.symbol,
        decimals: reserve.decimals,
        markets: [snapshot.market],
        priceUsd: tokenAmountToUsd({
          amount: 10n ** BigInt(reserve.decimals),
          decimals: reserve.decimals,
          priceBase: reserve.priceBase,
          baseCurrencyUnit: snapshot.baseCurrencyUnit,
        }),
      });
    });

    return assets;
  }, []);

/**
 * The collateral symbol a funding asset is read for across the markets: the
 * asset itself (ETH as WETH) when any market lists it, else WETH, to which
 * it is converted (decided in the plan review).
 */
const collateralSymbolFor = (
  fundingSymbol: string,
  snapshots: readonly MarketSnapshot[],
) =>
  snapshots
    .map((snapshot) => collateralFor(fundingSymbol, snapshot))
    .find((choice) => choice !== undefined && !choice.convertedFrom)?.reserve
    .symbol ?? DEFAULT_PAIR.collateral;

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
 * The collateral amount, in the reserve's units: the typed amount when the
 * asset is supplied as itself; when it is converted, its 1Click dollar value
 * at the collateral's oracle price (an estimate until a quote).
 */
const collateralAmountOf = ({
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

const NOT_CONNECTED_FUNDING: Omit<FundingAssets, 'refresh'> = {
  rows: [],
  unreadChains: [],
  status: 'idle',
};

/**
 * The New loan form's state and the figures derived from it through the
 * loan model, for the selected market. Funding comes from the wallet's
 * balances (1Click prices); the loan figures use the market's oracle prices
 * (decided in the plan review).
 *
 * `walletFamily` is `useIntentsConnectWallet().family`: a connected wallet
 * of another family than `evm` (Solana) must name an EVM recipient, since
 * the borrowed funds arrive on the market's EVM chain. An unknown family
 * (`null`, or not given) is not taken for a non-EVM one.
 */
export const useLoanForm = ({
  connected,
  walletFamily,
}: {
  connected: boolean;
  walletFamily?: string | null;
}): LoanForm => {
  const wallet = useFundingAssets();
  const { snapshots, listing } = useMarketSnapshots();

  const [fundingId, setFundingId] = useState<string>();
  const [collateralPick, setCollateralPick] = useState<string>();
  const [amount, setAmount] = useState('');
  const [borrowSymbol, setBorrowSymbol] = useState(DEFAULT_PAIR.borrow);
  const [ltv, setLtv] = useState(DEFAULT_LTV);
  const [pickedMarketId, setPickedMarketId] = useState<string>();
  const [recipientEnabled, setRecipientEnabled] = useState(false);
  const [recipient, setRecipient] = useState('');

  const fundingAssets: FundingAssets = connected
    ? wallet
    : { ...NOT_CONNECTED_FUNDING, refresh: wallet.refresh };

  const ready = snapshots.flatMap((result) =>
    result.status === 'success' ? [result.data] : [],
  );

  const marketsSettled =
    !listing && snapshots.every(({ status }) => status !== 'pending');

  const collateralAssets = reserveAssets(ready, ({ collateral }) => collateral);

  // A held balance when connected (the pick, else the most valuable one that
  // can fund a loan); the default collateral, or the one picked, otherwise.
  const available = fundingAssets.rows.filter(
    ({ unavailableReason }) => unavailableReason === undefined,
  );

  const held = connected
    ? (available.find(({ assetId }) => assetId === fundingId) ?? available[0])
    : undefined;

  const fundingSymbol =
    held?.symbol ??
    (connected ? undefined : collateralPick) ??
    DEFAULT_PAIR.collateral;

  const funding: Funding = {
    asset: held,
    symbol: fundingSymbol,
    decimals:
      held?.decimals ??
      collateralAssets.find(({ symbol }) => sameSymbol(symbol, fundingSymbol))
        ?.decimals ??
      18,
  };

  const collateralSymbol = collateralSymbolFor(fundingSymbol, ready);

  // The collateral is never borrowed too (decided in the feature review): its
  // symbol is left out of the borrow list, and a borrow asset that collides
  // with it (USDC held and listed as collateral, say) moves to the default,
  // else the first asset left.
  const borrowAssets = reserveAssets(
    ready,
    ({ borrowable }) => borrowable,
  ).filter(({ symbol }) => !sameSymbol(symbol, collateralSymbol));

  const bySymbol = (wanted: string) =>
    borrowAssets.find(({ symbol }) => sameSymbol(symbol, wanted));

  const borrowAsset =
    bySymbol(borrowSymbol) ??
    (sameSymbol(borrowSymbol, collateralSymbol)
      ? (bySymbol(DEFAULT_PAIR.borrow) ?? borrowAssets[0])
      : undefined);

  const pair: MarketPair = {
    collateral: collateralSymbol,
    borrow: borrowAsset?.symbol ?? borrowSymbol,
  };

  const marketRows = ready.flatMap((snapshot) => pairRow(snapshot, pair) ?? []);
  const fit = marketFit({ rows: marketRows, ltv, pickedId: pickedMarketId });
  const { fits } = fit;

  // One rule with the market list: until every market has settled, BEST is
  // not known, so only the user's own pick (when it fits) is a selection.
  const fittingPick =
    pickedMarketId !== undefined && fits.get(pickedMarketId) === true
      ? pickedMarketId
      : undefined;

  const selectedId = marketsSettled ? fit.selectedId : fittingPick;

  // The selection, or, once settled and none fits, a stand-in for the
  // figures only; nothing while the markets still load.
  const figuresRow =
    marketRows.find(({ market }) => market.id === selectedId) ??
    (marketsSettled ? marketRows[0] : undefined);

  const snapshot = ready.find(
    ({ market }) => market.id === figuresRow?.market.id,
  );

  const choice = snapshot ? collateralFor(fundingSymbol, snapshot) : undefined;
  const borrowReserve = snapshot?.borrowable.find(({ symbol }) =>
    sameSymbol(symbol, pair.borrow),
  );

  // Before a market is known, the pair already says whether it converts.
  const converted = choice
    ? choice.convertedFrom !== undefined
    : !sameSymbol(pair.collateral, fundingSymbol) &&
      !(
        sameSymbol(fundingSymbol, 'ETH') && sameSymbol(pair.collateral, 'WETH')
      );

  const atomic = toAtomic(amount, funding.decimals);
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

  const figures =
    snapshot && choice && borrowReserve
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

  const market = ready.find(({ market: { id } }) => id === selectedId)?.market;
  const borrowDecimals = borrowReserve?.decimals ?? borrowAsset?.decimals ?? 6;

  // No held row means a zero balance only once the balances have been read;
  // while they load or after a failed read, the balance is unknown.
  const balance =
    held?.amount ?? (fundingAssets.status === 'ready' ? 0n : undefined);

  const recipientRequired =
    connected &&
    walletFamily !== undefined &&
    walletFamily !== null &&
    walletFamily !== 'evm';

  const sendToOther = recipientEnabled || recipientRequired;
  const recipientCheck = validateRecipient(recipient);

  const cta = ctaState({
    connected,
    amount: atomic,
    balance,
    borrowAmount: figures?.borrowAmount ?? 0n,
    borrow: { symbol: pair.borrow, decimals: borrowDecimals },
    market,
    sendToOther,
    recipientRequired,
    recipient: recipientCheck,
  });

  return {
    connected,
    fundingAssets,
    funding,
    pickFunding: connected ? setFundingId : setCollateralPick,
    collateralAssets,
    amount,
    setAmount,
    amountUsd,
    collateral: {
      symbol: pair.collateral,
      convertedFrom: converted ? fundingSymbol : undefined,
    },
    borrowAssets,
    borrow: { symbol: pair.borrow, decimals: borrowDecimals },
    setBorrowSymbol,
    ltv,
    setLtv,
    pair,
    marketRows,
    market,
    figuresMarket: snapshot?.market,
    liquidationLtvBps: figuresRow?.liquidationLtvBps,
    disabledMarketIds: marketRows.flatMap(({ market: { id } }) =>
      fits.get(id) === true ? [] : [id],
    ),
    marketsSettled,
    pickMarket: setPickedMarketId,
    recipientEnabled: sendToOther,
    setRecipientEnabled: (enabled) => {
      if (recipientRequired) {
        return;
      }

      setRecipientEnabled(enabled);

      if (!enabled) {
        setRecipient('');
      }
    },
    recipientRequired,
    recipient,
    setRecipient,
    recipientAddress:
      sendToOther && recipientCheck.status === 'valid'
        ? recipientCheck.address
        : undefined,
    figures,
    liquidationPriceUsd:
      figures && figures.liquidationPrice !== null && snapshot
        ? baseToUsd(figures.liquidationPrice, snapshot.baseCurrencyUnit)
        : undefined,
    cta,
  };
};
