import { formatApr } from '../markets/format';
import {
  formatAmount,
  formatUsd,
  USD_CENTS,
  USD_ROUND,
} from '../loan/loanFormat';
import type { LoanPosition, PositionAsset } from './types';

/**
 * A position's figures as the position card shows them
 * (Web-Positions-Multi.dc.html script lines 1392–1400). A figure the
 * provider did not return is "—", never invented.
 */

export const DASH = '—';

const ONE_DP = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TWO_DP = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A fraction (0.5) to "50.0%": the LTV to one decimal (line 1395). */
export const formatLtv = (fraction: number) =>
  `${ONE_DP.format(fraction * 100)}%`;

/** Health to two decimals, "1.66" (line 1398). */
export const formatHealth = (health: number) => TWO_DP.format(health);

/**
 * The health figure's colour (line 1398): `pos` from 1.5, `#B26A00` from
 * 1.2 (a literal on the artboard, the same in both themes, with no token),
 * `neg` below.
 */
export const healthTone = (health: number | null) => {
  if (health === null) {
    return 'text-ink';
  }

  if (health >= 1.5) {
    return 'text-pos';
  }

  return health >= 1.2 ? 'text-[#B26A00]' : 'text-neg';
};

/** "$72.75": interest per year, always in cents (line 1400). */
export const formatUsdCents = (usd: number) => `$${USD_CENTS.format(usd)}`;

/** "4.85%", or "—" when unknown. */
export const formatOptionalApr = (fraction: number | null) =>
  fraction === null ? DASH : formatApr(fraction);

/** The reserve with the largest dollar value; unpriced reserves come last. */
export const largestReserve = (assets: readonly PositionAsset[]) =>
  assets.reduce<PositionAsset | undefined>(
    (best, asset) =>
      best === undefined || (asset.usd ?? -1) > (best.usd ?? -1) ? asset : best,
    undefined,
  );

/**
 * "WETH → USDC": the largest collateral and debt reserves; one side alone
 * when the other is empty (a repaid loan has no debt).
 */
export const pairLabel = (position: LoanPosition) =>
  [position.collateral, position.debt]
    .map((assets) => largestReserve(assets)?.symbol)
    .filter((symbol) => symbol !== undefined)
    .join(' → ');

/** "$1,500": whole dollars, as the summary's figures (lines 1619–1621). */
export const formatUsdWhole = (usd: number) => `$${USD_ROUND.format(usd)}`;

/**
 * A summary card's status tag (script line 1621): "At risk" in the kit's
 * `risk` tone, "Active" and "Repaid" in `positive`.
 */
const STATUS_TAGS = {
  active: { label: 'Active', tone: 'positive' },
  'at-risk': { label: 'At risk', tone: 'risk' },
  repaid: { label: 'Repaid', tone: 'positive' },
} as const satisfies Record<
  LoanPosition['status'],
  { label: string; tone: 'positive' | 'risk' }
>;

export const statusTag = (status: LoanPosition['status']) =>
  STATUS_TAGS[status];

/**
 * A Collateral or Debt tile's figure: the largest reserve by dollar value,
 * "1.5 WETH", with "+N more" for the rest; "—" when there is none.
 */
export const reservesLabel = (assets: readonly PositionAsset[]) => {
  const lead = largestReserve(assets);

  if (!lead) {
    return { amount: DASH, more: undefined };
  }

  return {
    amount: `${formatAmount(lead.amount)} ${lead.symbol}`,
    more: assets.length > 1 ? `+${assets.length - 1} more` : undefined,
  };
};

/**
 * The pill: the market for a loan Borrow manages, the provider for a
 * read-only one, then the borrow APR when it is known (line 406).
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
 * The at-risk text, as the artboard builds it (script line 1397): the
 * health, the collateral price at which the loan is liquidated and how far
 * below today that is (`1 − 1 / health`). Without a liquidation price, the
 * drop is told without it; at or under health 1 the loan can already be
 * liquidated.
 */
export const riskText = (position: LoanPosition) => {
  const { health, liquidationPrice } = position;
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
    ? `If ${liquidationPrice.symbol} falls to ${formatUsd(liquidationPrice.usd)} (${drop})`
    : `If your collateral falls ${drop}`;

  return `${healthText} ${fall}, part of your collateral is sold to repay the loan. ${advice}`;
};
