import { useState } from 'react';

import { useMarketSnapshots } from '@/domains/markets/hooks/useMarketSnapshots';
import { useFundingAssets } from '@/domains/wallet/hooks/useFundingAssets';
import type { LendingMarket } from '@/domains/markets/types';
import type { FundingAssets } from '@/domains/wallet/types';

import { toBorrowRequest } from '../model/borrowRequest';
import { collateralSymbolFor } from '../model/collateral';
import { ctaState } from '../model/ctaState';
import { pickFunding, toAtomic } from '../model/funding';
import { loanInMarket, loanSizeUsd } from '../model/loanInMarket';
import { selectMarket } from '../model/marketFit';
import { pairRow, providerRows } from '../model/marketRows';
import { recipientState } from '../model/recipient';
import {
  decimalsOf,
  DEFAULT_PAIR,
  pickBorrowAsset,
  reserveAssets,
} from '../model/reserveAssets';
import type { BorrowRequest } from '../model/borrowRequest';
import type { CtaState } from '../model/ctaState';
import type { Funding } from '../model/funding';
import type { LoanFigures } from '../model/loanFigures';
import type { LoanInMarket } from '../model/loanInMarket';
import type { MarketPair, MarketRow } from '../model/marketRows';
import type { ReserveAsset } from '../model/reserveAssets';

export type { BorrowRequest } from '../model/borrowRequest';

/** The slider's starting loan-to-value, in whole percent (line 1053). */
const DEFAULT_LTV = 50;

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

const NOT_CONNECTED_FUNDING: Omit<FundingAssets, 'refresh'> = {
  rows: [],
  unreadChains: [],
  status: 'idle',
};

/**
 * The held balance. No held row means a zero balance only once the balances
 * have been read; while they load or after a failed read, it is unknown.
 */
const balanceOf = (
  funding: Funding,
  status: FundingAssets['status'],
): bigint | undefined =>
  funding.asset?.amount ?? (status === 'ready' ? 0n : undefined);

/** The borrow's decimals: the figures' market's reserve, else the picker's. */
const borrowDecimalsOf = (
  { borrowReserve }: LoanInMarket,
  borrowAsset: ReserveAsset | undefined,
): number => borrowReserve?.decimals ?? borrowAsset?.decimals ?? 6;

/** The collateral as supplied in the figures' market, else as listed. */
const collateralOf = (
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

/**
 * The New loan form's state, and what the loan model (`../model/*`) derives
 * from it for the selected market. Funding comes from the wallet's balances
 * (1Click prices); the loan figures use the market's oracle prices (decided
 * in the plan review). Every derivation is a pure function of the model; this
 * hook only holds the inputs and wires them together.
 *
 * `walletFamily` is `useIntentsConnectWallet().family`: a connected wallet
 * of another family than `evm` (Solana) must name an EVM recipient
 * (`recipientState`).
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
  const [pickedProvider, setPickedProvider] = useState<string>();
  const [recipientTicked, setRecipientTicked] = useState(false);
  const [recipient, setRecipient] = useState('');

  const fundingAssets: FundingAssets = connected
    ? wallet
    : { ...NOT_CONNECTED_FUNDING, refresh: wallet.refresh };

  const ready = snapshots.flatMap((result) =>
    result.status === 'success' ? [result.data] : [],
  );

  const marketsSettled =
    !listing && snapshots.every(({ status }) => status !== 'pending');

  // The pickers and the pair.
  const collateralAssets = reserveAssets(ready, ({ collateral }) => collateral);
  const funding = pickFunding({
    connected,
    rows: fundingAssets.rows,
    fundingId,
    collateralPick,
    collateralAssets,
  });

  const collateralSymbol = collateralSymbolFor(funding.symbol, ready);
  const { borrowAssets, asset: borrowAsset } = pickBorrowAsset({
    borrowable: reserveAssets(ready, ({ borrowable }) => borrowable),
    borrowSymbol,
    collateralSymbol,
  });

  const pair: MarketPair = {
    collateral: collateralSymbol,
    borrow: borrowAsset?.symbol ?? borrowSymbol,
  };

  // The markets with the pair, and the one the loan goes to.
  const marketRows = ready.flatMap((snapshot) => pairRow(snapshot, pair) ?? []);
  const snapshotOf = (row: MarketRow | undefined) =>
    ready.find(({ market }) => market.id === row?.market.id);

  const atomic = toAtomic(amount, funding.decimals);

  // The loan's size chooses each provider's chain, so it is read without
  // the chosen chain: in the first market with the pair (a 1Click price
  // when there is one, else that market's oracle).
  const loanUsd = loanSizeUsd({
    snapshot: snapshotOf(marketRows[0]),
    funding,
    pair,
    atomic,
    ltv,
  });

  const providers = providerRows(marketRows, loanUsd);
  const { selectedRow, figuresRow, disabledProviders } = selectMarket({
    providers,
    ltv,
    pickedProvider,
    marketsSettled,
  });

  // The loan in the figures' market.
  const snapshot = snapshotOf(figuresRow);
  const loan = loanInMarket({ snapshot, funding, pair, atomic, ltv });
  const { choice, borrowReserve, figures } = loan;

  const market = selectedRow?.market;
  const borrowDecimals = borrowDecimalsOf(loan, borrowAsset);

  // The recipient and the call to action.
  const to = recipientState({
    connected,
    walletFamily,
    ticked: recipientTicked,
    value: recipient,
  });

  const cta = ctaState({
    connected,
    amount: atomic,
    balance: balanceOf(funding, fundingAssets.status),
    borrowAmount: figures?.borrowAmount ?? 0n,
    borrow: { symbol: pair.borrow, decimals: borrowDecimals },
    market,
    sendToOther: to.enabled,
    recipient: to.check,
  });

  return {
    connected,
    fundingAssets,
    funding,
    pickFunding: connected ? setFundingId : setCollateralPick,
    collateralAssets,
    amount,
    setAmount,
    amountUsd: loan.amountUsd,
    collateral: collateralOf(loan, { funding, pair, collateralAssets }),
    borrowAssets,
    borrow: { symbol: pair.borrow, decimals: borrowDecimals },
    setBorrowSymbol,
    ltv,
    setLtv,
    pair,
    loanUsd,
    market,
    figuresMarket: snapshot?.market,
    liquidationLtvBps: figuresRow?.liquidationLtvBps,
    disabledMarketIds: disabledProviders,
    pickMarket: setPickedProvider,
    recipientEnabled: to.enabled,
    setRecipientEnabled: (enabled) => {
      if (to.required) {
        return;
      }

      setRecipientTicked(enabled);

      if (!enabled) {
        setRecipient('');
      }
    },
    recipientRequired: to.required,
    recipient,
    setRecipient,
    figures,
    liquidationPriceUsd: loan.liquidationPriceUsd,
    cta,
    borrowRequest: toBorrowRequest({
      cta,
      held: funding.asset,
      market,
      choice,
      borrowReserve,
      figures,
      atomic,
      ltv,
      recipient: to.address,
      fundingAssets,
    }),
  };
};
