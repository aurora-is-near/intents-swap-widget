/**
 * Validate and parse token decimals
 * @param decimalsStr - String representation of decimals
 * @returns Parsed decimals number or null if invalid
 */
export function parseDecimals(decimalsStr: string): number | null {
  const decimals = parseInt(decimalsStr, 10);

  // Validate decimals range (0-18 for most tokens, up to 24 for some)
  if (Number.isNaN(decimals) || decimals < 0 || decimals > 24) {
    return null;
  }

  return decimals;
}
