import { formatUsdAmount } from '@aurora-is-near/intents-swap-widget/utils';

import { formatAmount } from '../utils';

/** `$2,463.02`, and `$0.0₅12` for prices too small for cents. */
export const formatPrice = (price: number) =>
  price >= 0.01 ? formatUsdAmount(price) : `$${formatAmount(price)}`;

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

/** `$299.76M` */
export const formatCompactUsd = (value: number | null | undefined) =>
  value === null || value === undefined ? undefined : compactUsd.format(value);

/** `73.26B` */
export const formatCompact = (value: number | null | undefined) =>
  value === null || value === undefined ? undefined : compact.format(value);

/** `+1.25%`, `-0.04%` */
export const formatChange = (percent: number) =>
  `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
