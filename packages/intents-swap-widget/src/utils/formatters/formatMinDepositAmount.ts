import { formatBigToHuman } from './formatBigToHuman';

const DISPLAY_DECIMALS = 5;

/**
 * Like `formatBigToHuman`, but rounds up to the displayed precision instead of
 * truncating - a minimum shown below the real one gets the deposit refunded.
 */
export const formatMinDepositAmount = (amount: string, decimals: number) => {
  // quotes from a custom `fetchQuote` are not validated at runtime
  if (!/^\d+$/.test(amount)) {
    return '';
  }

  if (decimals <= DISPLAY_DECIMALS) {
    return formatBigToHuman(amount, decimals);
  }

  const step = 10n ** BigInt(decimals - DISPLAY_DECIMALS);
  const rounded = ((BigInt(amount) + step - 1n) / step) * step;

  return formatBigToHuman(rounded.toString(), decimals);
};
