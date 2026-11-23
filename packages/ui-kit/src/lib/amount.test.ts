import { describe, expect, it } from 'vitest';

import { sanitizeAmountInput } from './amount';

describe('sanitizeAmountInput', () => {
  it.each([
    // [raw, decimals, expected]
    ['', undefined, ''],
    ['0', undefined, '0'],
    ['12', undefined, '12'],
    ['1.5', undefined, '1.5'],
    // A comma becomes a dot.
    ['1,5', undefined, '1.5'],
    ['1,', undefined, '1.'],
    // A leading dot gets a zero.
    ['.5', undefined, '0.5'],
    ['.', undefined, '0.'],
    [',5', undefined, '0.5'],
    // Leading zeros collapse.
    ['007', undefined, '7'],
    ['000', undefined, '0'],
    ['00.5', undefined, '0.5'],
    ['0.05', undefined, '0.05'],
    // A trailing dot and trailing zeros stay while typing.
    ['1.', undefined, '1.'],
    ['1.50', undefined, '1.50'],
    // Only the first dot is kept.
    ['1.2.3', undefined, '1.23'],
    ['1,2.3', undefined, '1.23'],
    // No signs, exponents, spaces or letters.
    ['-5', undefined, '5'],
    ['+5', undefined, '5'],
    ['1e5', undefined, '15'],
    ['abc', undefined, ''],
    ['1a', undefined, '1'],
    [' 1 000 ', undefined, '1000'],
    // The fraction is cut to `decimals`.
    ['1.123456789', 6, '1.123456'],
    ['0.129', 2, '0.12'],
    ['1.5', 2, '1.5'],
    ['1.', 2, '1.'],
    // `decimals = 0` allows no dot.
    ['1.5', 0, '1'],
    ['.5', 0, ''],
    ['12,', 0, '12'],
  ] as const)('%j with decimals %s gives %j', (raw, decimals, expected) => {
    expect(sanitizeAmountInput(raw, decimals)).toBe(expected);
  });
});
