/**
 * Copied from the Aave extension's `ui/assets/amounts.ts` (apps do not
 * import from each other).
 */

/** Exact decimal string of a smallest-unit amount. */
const fromAtomic = (value: string, decimals: number): string => {
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals || undefined) || '0';
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, '') : '';

  return fraction ? `${whole}.${fraction}` : whole;
};

/** USD value of a smallest-unit amount; `undefined` without a price. */
export const usdValue = (
  atomic: string,
  decimals: number,
  price: number | undefined,
): number | undefined =>
  price ? Number(fromAtomic(atomic, decimals)) * price : undefined;
