import { formatApr, formatBps } from '@/domains/markets/utils/format';
import {
  formatAmount,
  formatUsd,
  USD_CENTS,
  USD_ROUND,
} from '@/domains/loan/utils/loanFormat';

import { largestReserve } from '../model/reserves';
import type { LoanPosition, LoanStatus, PositionAsset } from '../types';

/**
 * A loan's figures as My positions shows them (Web-Positions-Multi.dc.html
 * script lines 1392–1400, 1616–1621). A figure the source did not give is
 * "—", never invented.
 */

const DASH = '—';

const ONE_DP = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TWO_DP = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A fraction to bps, rounded so 0.825 is 8250, not 8250.000…1. */
const toBps = (fraction: number) => Math.round(fraction * 10_000);

/** The LTV to one decimal, "40.0%" (line 1395); "—" when unknown. */
export const formatLtv = (fraction: number | null) =>
  fraction === null ? DASH : `${ONE_DP.format(fraction * 100)}%`;

/** "83%", "82.5%"; "—" when unknown. */
export const formatLiquidationLtv = (fraction: number | null) =>
  fraction === null ? DASH : formatBps(toBps(fraction));

/** Health to two decimals, "1.66" (line 1398); "—" without debt. */
export const formatHealth = (health: number | null) =>
  health === null ? DASH : TWO_DP.format(health);

/**
 * The health figure's colour (line 1398): `pos` from 1.5, the caution amber
 * from 1.2, `neg` below; `fallback` when there is no health.
 */
export const healthTone = (health: number | null, fallback = 'text-ink') => {
  if (health === null) {
    return fallback;
  }

  if (health >= 1.5) {
    return 'text-pos';
  }

  return health >= 1.2 ? 'text-caution' : 'text-neg';
};

/** "4.85%"; "—" when unknown. */
export const formatOptionalApr = (fraction: number | null) =>
  fraction === null ? DASH : formatApr(fraction);

/** "$58.20": a dollar figure in cents (line 1400); "—" when unknown. */
export const formatUsdCents = (usd: number | null) =>
  usd === null ? DASH : `$${USD_CENTS.format(usd)}`;

/** "$1,500": whole dollars, as the summary's figures (line 1619); "—" when unknown. */
export const formatUsdWhole = (usd: number | null) =>
  usd === null ? DASH : `$${USD_ROUND.format(usd)}`;

const PRICE_UNDER_ONE = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 3,
});

/**
 * A token price: whole dollars from $100 ("$1,446", as the artboard's script
 * line 1398), cents from $1 ("$2.41"), and three significant digits under $1
 * ("$0.00412"), so a small price never reads "$0.00".
 */
const formatPrice = (usd: number) =>
  usd >= 1 ? formatUsd(usd) : `$${PRICE_UNDER_ONE.format(usd)}`;

/** "$1,446", "$0.00412"; "—" when unknown. */
export const formatLiquidationPrice = (
  price: LoanPosition['liquidationPrice'],
) => (price === null ? DASH : formatPrice(price.usd));

/**
 * A Collateral or Debt tile's figure: the largest reserve, "1.5 WETH", and
 * "+N more" for the rest; "—" with none.
 */
export const reservesLabel = (assets: readonly PositionAsset[]) => {
  const lead = largestReserve(assets);

  if (!lead) {
    return { amount: DASH, more: undefined };
  }

  return {
    amount: `${formatAmount(lead.asset.amount)} ${lead.asset.symbol}`,
    more: lead.more > 0 ? `+${lead.more} more` : undefined,
  };
};

/**
 * "WETH → USDC": the largest collateral and debt reserves; one side alone
 * when the other is empty (a repaid loan has no debt).
 */
export const pairLabel = ({ collateral, debt }: LoanPosition) =>
  [collateral, debt]
    .map((assets) => largestReserve(assets)?.asset.symbol)
    .filter((symbol) => symbol !== undefined)
    .join(' → ');

/**
 * The pill (line 406): the market for a loan Borrow manages, the provider
 * for a read-only one, then the borrow APR when known.
 */
export const pillLabel = (position: LoanPosition) => {
  const name = position.manageable
    ? position.marketName
    : position.providerName;

  return position.borrowApr === null
    ? name
    : `${name} · ${formatApr(position.borrowApr)} APR`;
};

/**
 * A summary card's status tag (script line 1621): its text and the `.stag`
 * colours, "At risk" on `negbg`, the others on `tint`.
 */
export const STATUS_TAGS = {
  active: { label: 'Active', className: 'bg-tint text-pos' },
  'at-risk': { label: 'At risk', className: 'bg-negbg text-neg' },
  // No debt: a repaid loan or a supply that never borrowed look the same.
  repaid: { label: 'Collateral only', className: 'bg-tint text-pos' },
} as const satisfies Record<LoanStatus, { label: string; className: string }>;

/**
 * The at-risk text (script line 1397): the health, the collateral price at
 * which the loan is liquidated, and how far below today that is
 * (`1 − 1 / health`). Without a liquidation price the drop is told alone; at
 * or under health 1 the loan can already be liquidated.
 */
export const riskText = ({ health, liquidationPrice }: LoanPosition) => {
  const advice = 'Add collateral or repay some debt to stay safe.';

  if (health === null) {
    return `Your loan is close to liquidation. ${advice}`;
  }

  const healthText = `Health is ${formatHealth(health)}.`;

  if (health <= 1) {
    return `${healthText} Part of your collateral can be sold to repay the loan at any moment. ${advice}`;
  }

  const drop = `${ONE_DP.format((1 - 1 / health) * 100)}% below today`;
  const fall = liquidationPrice
    ? `If ${liquidationPrice.symbol} falls to ${formatPrice(liquidationPrice.usd)} (${drop})`
    : `If your collateral falls ${drop}`;

  return `${healthText} ${fall}, part of your collateral is sold to repay the loan. ${advice}`;
};
