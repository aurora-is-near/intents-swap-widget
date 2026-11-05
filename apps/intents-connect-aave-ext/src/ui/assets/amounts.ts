/** Exact decimal string of a smallest-unit amount. */
const fromAtomic = (value: string, decimals: number): string => {
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals || undefined) || '0';
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, '') : '';

  return fraction ? `${whole}.${fraction}` : whole;
};

/**
 * Amount for display: grouped whole part and four fraction digits, or four
 * significant ones below 1. Truncated, never rounded up, so a balance is
 * never overstated.
 */
export const formatAmount = (atomic: string, decimals: number): string => {
  const [whole = '0', fraction = ''] = fromAtomic(atomic, decimals).split('.');
  const leadingZeros =
    whole === '0' ? Math.max(fraction.search(/[1-9]/), 0) : 0;

  const shown = fraction.slice(0, leadingZeros + 4).replace(/0+$/, '');
  const grouped = BigInt(whole).toLocaleString('en-US');

  return shown ? `${grouped}.${shown}` : grouped;
};

/** USD value of a smallest-unit amount; `undefined` without a price. */
export const usdValue = (
  atomic: string,
  decimals: number,
  price: number | undefined,
): number | undefined =>
  price ? Number(fromAtomic(atomic, decimals)) * price : undefined;

export const formatUsd = (value: number): string =>
  value > 0 && value < 0.01
    ? '<$0.01'
    : value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      });
