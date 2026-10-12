import { isSameAmount } from './isSameAmount';

describe('isSameAmount', () => {
  it.each([
    ['1', '1'],
    ['1.', '1'],
    ['1.0', '1'],
    ['1.50', '1.5'],
    ['10', '10'],
    ['', ''],
  ])('treats %p and %p as the same amount', (a, b) => {
    expect(isSameAmount(a, b)).toBe(true);
  });

  it.each([
    ['1.05', '1'],
    ['10', '1'],
    ['1', ''],
    ['100', '1'],
  ])('treats %p and %p as different amounts', (a, b) => {
    expect(isSameAmount(a, b)).toBe(false);
  });
});
