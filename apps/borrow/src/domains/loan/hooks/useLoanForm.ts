import { useState } from 'react';

import { useMarketSnapshots } from '@/domains/markets/hooks/useMarketSnapshots';
import { useFundingAssets } from '@/domains/wallet/hooks/useFundingAssets';
import type { FundingAssets } from '@/domains/wallet/types';

import { toBorrowRequest } from '../model/borrowRequest';
import { collateralSymbolFor } from '../model/collateral';
import { ctaState } from '../model/ctaState';
import { pickFunding, toAtomic } from '../model/funding';
import {
  balanceOf,
  borrowDecimalsOf,
  collateralOf,
  NOT_CONNECTED_FUNDING,
} from '../model/loanForm';
import { loanInMarket, loanSizeUsd } from '../model/loanInMarket';
import { selectMarket } from '../model/marketFit';
import { pairRow, providerRows } from '../model/marketRows';
import { recipientState } from '../model/recipient';
import {
  DEFAULT_PAIR,
  pickBorrowAsset,
  reserveAssets,
} from '../model/reserveAssets';
import type { LoanForm } from '../model/loanForm';
import type { MarketPair, MarketRow } from '../model/marketRows';

export type { BorrowRequest } from '../model/borrowRequest';

/** The slider's starting loan-to-value, in whole percent (line 1053). */
const DEFAULT_LTV = 50;

/**
 * The New loan form's state, and what the loan model (`../model/*`) derives
 * from it for the selected market. Funding comes from the wallet's balances
 * (1Click prices); the loan figures use the market's oracle prices (decided
 * in the plan review). Every derivation is a pure function of the model; this
 * hook only holds the inputs and wires them together.
 *
 * `walletFamily` is `useWallet().family`: a connected wallet of another
 * family than `evm` (Solana, NEAR, Stellar) must name an EVM recipient
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
    maxLtvBps: figuresRow?.maxLtvBps,
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
