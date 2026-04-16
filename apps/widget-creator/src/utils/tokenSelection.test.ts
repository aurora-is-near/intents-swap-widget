import { describe, expect, it } from 'vitest';

import {
  getSelectableTokenSymbols,
  hasAllSelectableTokensSelected,
  normalizeSelectedTokenSymbols,
} from './tokenSelection';

describe('tokenSelection', () => {
  it('drops disabled symbols and keeps the USDT alias in sync', () => {
    expect(
      normalizeSelectedTokenSymbols(['NEAR', 'USDT', 'USDT0', 'FMS', 'ABG']),
    ).toEqual(['NEAR', 'USDT', 'USDT0']);

    expect(normalizeSelectedTokenSymbols(['NEAR', 'USDT0'])).toEqual(['NEAR']);
  });

  it('returns only user-visible symbols for display', () => {
    expect(
      getSelectableTokenSymbols(['NEAR', 'USDT', 'USDT0', 'WETH']),
    ).toEqual(['NEAR', 'USDT']);
  });

  it('recognizes all-selected state after normalization', () => {
    expect(
      hasAllSelectableTokensSelected(
        ['NEAR', 'USDT', 'USDT0'],
        ['NEAR', 'USDT', 'USDT0', 'WETH'],
      ),
    ).toBe(true);

    expect(
      hasAllSelectableTokensSelected(
        ['USDT', 'USDT0'],
        ['NEAR', 'USDT', 'USDT0', 'WETH'],
      ),
    ).toBe(false);
  });
});
