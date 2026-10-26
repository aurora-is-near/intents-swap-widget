import { formatMinDepositAmount } from './formatMinDepositAmount';

describe('formatMinDepositAmount', () => {
  it.each([
    ['1000000', 6, '1.0'],
    ['990426', 6, '0.99043'],
    ['100000', 8, '0.001'],
    ['10890', 8, '0.00011'],
    ['432123456789012345', 18, '0.43213'],
    ['4321', 3, '4.321'],
  ])('formats %p with %p decimals as %p', (amount, decimals, expected) => {
    expect(formatMinDepositAmount(amount, decimals)).toBe(expected);
  });

  it.each([[''], ['1.5'], ['abc'], [undefined]])(
    'returns an empty string for malformed amount %p',
    (amount) => {
      expect(formatMinDepositAmount(amount as string, 6)).toBe('');
    },
  );
});
