import { getFlexInputRetryAmount } from './getFlexInputRetryAmount';

describe('getFlexInputRetryAmount', () => {
  it.each([
    // 1 USDT on Tron at 1% slippage: 1010102 * 0.99 = 1000000.98
    ['Amount is too low for bridge, try at least 1000000', 100, '1010102'],
    ['Amount is too low for bridge, try at least 1902690', 100, '1921910'],
    ['Amount is too low for bridge, try at least 1000000', 0, '1000000'],
    ['Amount is too low for bridge, try at least 1000000', 50, '1005026'],
  ])('grosses %p up for %p bps slippage', (message, slippage, expected) => {
    expect(getFlexInputRetryAmount(message, slippage)).toBe(expected);
  });

  it.each([
    ['Quoting for this pair is not available', 100],
    ['Amount is too low', 100],
    ['Amount is too low for bridge, try at least 1000000', 10_000],
    ['Amount is too low for bridge, try at least 1000000', NaN],
    ['Amount is too low for bridge, try at least 1000000', Infinity],
  ])('returns undefined for %p at %p bps', (message, slippage) => {
    expect(getFlexInputRetryAmount(message, slippage)).toBeUndefined();
  });
});
