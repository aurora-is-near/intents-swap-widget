/**
 * The digits and dots an amount is cleaned from, a comma counting as a dot.
 * `\d` without the `u` flag is ASCII 0–9.
 */
export const keptCharacters = (text: string): string =>
  text.replace(/,/g, '.').replace(/[^\d.]/g, '');

/**
 * Cleans what a person types into an amount field into a plain decimal
 * string, keeping it a string so token amounts never round through a float.
 *
 * - A comma becomes a dot, so `1,5` is `1.5` on any keyboard.
 * - Only digits and the first dot stay: no sign, exponent, spaces or letters.
 * - Leading zeros collapse (`007` → `7`, `00.5` → `0.5`), and a leading dot
 *   gets a zero (`.5` → `0.5`).
 * - With `decimals`, the fraction is cut to that many digits; `0` allows no
 *   dot at all.
 * - A trailing dot or trailing zeros stay (`1.`, `1.50`), so typing can go on.
 *
 * Returns `''` when nothing is left.
 */
export function sanitizeAmountInput(raw: string, decimals?: number): string {
  const cleaned = keptCharacters(raw);
  const dot = cleaned.indexOf('.');
  let hasDot = dot !== -1;
  let whole = hasDot ? cleaned.slice(0, dot) : cleaned;
  // Every dot after the first is dropped.
  let fraction = hasDot ? cleaned.slice(dot + 1).replace(/\./g, '') : '';

  const maxDecimals =
    decimals === undefined ? undefined : Math.max(0, Math.floor(decimals));

  if (maxDecimals === 0) {
    hasDot = false;
  }

  if (maxDecimals !== undefined) {
    fraction = fraction.slice(0, maxDecimals);
  }

  whole = whole.replace(/^0+(?=\d)/, '');

  if (!hasDot) {
    return whole;
  }

  return `${whole === '' ? '0' : whole}.${fraction}`;
}
