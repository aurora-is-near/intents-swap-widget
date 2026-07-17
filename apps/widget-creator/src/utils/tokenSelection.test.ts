import { describe, expect, it } from 'vitest';

import type { TokenType } from '../hooks/useTokens';
import {
  hasAllSelectableTokensSelected,
  isTokenAvailable,
} from './tokenSelection';

const buildToken = (
  symbol: string,
  blockchains: TokenType['blockchains'],
): TokenType => ({
  decimals: 6,
  blockchains,
  symbol,
  icon: undefined,
});

describe('isTokenAvailable', () => {
  describe('when Intents is not selected', () => {
    it('is available when it lives on a selected network', () => {
      const token = buildToken('USDC', ['base']);

      expect(isTokenAvailable(token, ['base', 'sol'])).toBe(true);
    });

    it('is unavailable when it lives on no selected network', () => {
      const token = buildToken('BONK', ['sol']);

      expect(isTokenAvailable(token, ['base'])).toBe(false);
    });

    it('is unavailable when no networks are selected', () => {
      const token = buildToken('USDC', ['base']);

      expect(isTokenAvailable(token, [])).toBe(false);
    });
  });

  describe('when Intents is selected', () => {
    it('is available when no networks are selected', () => {
      const token = buildToken('USDC', ['base']);

      expect(isTokenAvailable(token, [], true)).toBe(true);
    });

    it('is available when it lives on no selected network', () => {
      const token = buildToken('BONK', ['sol']);

      expect(isTokenAvailable(token, ['base'], true)).toBe(true);
    });
  });
});

// The Intents layer holds every asset regardless of the chain that settles it,
// so the token allowlist sent to the widget must stay unrestricted as networks
// are added — otherwise the Intents balances collapse to the symbols that those
// networks happen to settle.
describe('selecting Intents and then adding networks', () => {
  const allTokens = [
    buildToken('USDC', ['base', 'sol', 'near']),
    buildToken('BONK', ['sol']),
    buildToken('AURORA', ['aurora']),
  ];

  const allSymbols = allTokens.map((token) => token.symbol);

  const selectAvailableSymbols = (
    selectedNetworks: string[],
    isIntentsSelected: boolean,
  ) =>
    allTokens
      .filter((token) =>
        isTokenAvailable(token, selectedNetworks, isIntentsSelected),
      )
      .map((token) => token.symbol);

  it('leaves every token selected with Intents alone', () => {
    const selected = selectAvailableSymbols([], true);

    expect(selected).toEqual(allSymbols);
    expect(hasAllSelectableTokensSelected(selected, allSymbols)).toBe(true);
  });

  it('leaves every token selected once Base is added', () => {
    const selected = selectAvailableSymbols(['base'], true);

    expect(selected).toEqual(allSymbols);
    expect(hasAllSelectableTokensSelected(selected, allSymbols)).toBe(true);
  });

  it('narrows to the selected networks when Intents is deselected', () => {
    const selected = selectAvailableSymbols(['base'], false);

    expect(selected).toEqual(['USDC']);
    expect(hasAllSelectableTokensSelected(selected, allSymbols)).toBe(false);
  });
});
