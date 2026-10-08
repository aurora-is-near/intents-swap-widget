import { formatTinyNumber } from '@aurora-is-near/intents-swap-widget/utils';

export const shortAddress = (address: string, head = 6, tail = 4) =>
  address.length > head + tail + 1
    ? `${address.slice(0, head)}…${address.slice(-tail)}`
    : address;

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/**
 * A token amount as the widget shows it (`formatTinyNumber`, `TinyNumber`),
 * as plain text for copy: `1,240.5`, `0.198`, and `0.0₆29` for long runs of
 * zeros. '' when it isn't a number.
 */
export const formatAmount = (value: number | string): string => {
  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num)) {
    return '';
  }

  const formatted = formatTinyNumber(num);

  if (!Array.isArray(formatted)) {
    return formatted;
  }

  const [head, zeros, rest] = formatted;
  const subscript = [...zeros]
    .map((digit) => SUBSCRIPT_DIGITS[Number(digit)] ?? digit)
    .join('');

  return `${head}${subscript}${rest}`;
};
