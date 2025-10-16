/**
 * Parse price with validation
 * @param priceStr - String representation of price
 * @returns Parsed price or 0 if invalid/null
 */
export function parsePrice(priceStr: string | null): number {
  if (!priceStr) {
    return 0;
  }

  const price = parseFloat(priceStr);

  return Number.isNaN(price) || price < 0 ? 0 : price;
}
