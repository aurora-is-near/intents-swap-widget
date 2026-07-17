import type { TokenType } from '../hooks/useTokens';

const DISABLED_TOKENS = [
  'fms',
  'abg',
  'stjack',
  'noear',
  'testnebula',
  'susdc',
  'weth',

  // Bridged NEAR. The canonical NEAR is wNEAR, shown as "NEAR", so this
  // duplicate is hidden from the token list — and must be excluded here
  // too, otherwise it stays selected-but-invisible and can never be deselected,
  // inflating the "N tokens selected" count.
  'near',
];

const USDT_SYMBOL = 'USDT';
const USDT_ALIAS_SYMBOL = 'USDT0';

export const isDisabledTokenSymbol = (symbol: string): boolean => {
  return DISABLED_TOKENS.includes(symbol.toLowerCase());
};

export const isTokenAvailable = (
  token: TokenType,
  selectedNetworks: string[],
  isIntentsSelected = false,
): boolean => {
  // The Intents layer holds every asset regardless of which chain settles it,
  // so selecting Intents makes all tokens available on its own — availability
  // must not narrow to the symbols that happen to exist on `selectedNetworks`.
  if (isIntentsSelected) {
    return true;
  }

  if (!selectedNetworks || selectedNetworks.length === 0) {
    return false;
  }

  return token.blockchains.some((blockchain) =>
    selectedNetworks.includes(blockchain),
  );
};

export const getSelectableTokenSymbols = (symbols: string[]): string[] => {
  return Array.from(new Set(symbols)).filter(
    (symbol) => symbol !== USDT_ALIAS_SYMBOL && !isDisabledTokenSymbol(symbol),
  );
};

export const normalizeSelectedTokenSymbols = (symbols: string[]): string[] => {
  const selectableSymbols = getSelectableTokenSymbols(symbols);

  if (!selectableSymbols.includes(USDT_SYMBOL)) {
    return selectableSymbols;
  }

  return [...selectableSymbols, USDT_ALIAS_SYMBOL];
};

export const hasAllSelectableTokensSelected = (
  selectedSymbols: string[],
  allSymbols: string[],
): boolean => {
  const selectableSymbols = getSelectableTokenSymbols(allSymbols);
  const selectedDisplaySymbols = new Set(
    getSelectableTokenSymbols(selectedSymbols),
  );

  return (
    selectableSymbols.length > 0 &&
    selectedDisplaySymbols.size === selectableSymbols.length &&
    selectableSymbols.every((symbol) => selectedDisplaySymbols.has(symbol))
  );
};
