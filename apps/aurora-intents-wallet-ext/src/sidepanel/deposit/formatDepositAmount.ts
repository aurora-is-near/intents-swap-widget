import { formatBigToHuman } from '@aurora-is-near/intents-swap-widget/utils';

import { formatAmount } from '../utils';

/**
 * Atomic units as an integer string. POA reports some amounts as JSON numbers
 * (NEAR's 24 decimals overflow them), which arrive as e.g. "1.5e+23"; those
 * are converted back, approximately, since precision was already lost.
 */
const toAtomic = (amount: string): string | null => {
  if (/^\d+$/.test(amount)) {
    return amount;
  }

  const value = Number(amount);

  return Number.isFinite(value) && value >= 0
    ? BigInt(Math.round(value)).toString()
    : null;
};

/** "250", "0.15", "0.0₆29"; '' when the amount or decimals can't be read. */
export const formatDepositAmount = (
  amount: string,
  decimals: number | null | undefined,
): string => {
  const atomic = toAtomic(amount);

  if (!atomic || !decimals) {
    return '';
  }

  try {
    return formatAmount(formatBigToHuman(atomic, decimals, false));
  } catch {
    return '';
  }
};
