import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import type { Token } from '@/types/token';

export const getUsdDisplayAmount = (
  token: Token,
  value: string,
  quoteUsdValue?: number,
) => {
  if (quoteUsdValue) {
    return formatUsdAmount(quoteUsdValue);
  }

  const valueNum = value && value !== 'NaN' ? parseFloat(value) : 0;

  return valueNum && !Number.isNaN(valueNum)
    ? formatUsdAmount(valueNum * token.price)
    : '$0.00';
};
