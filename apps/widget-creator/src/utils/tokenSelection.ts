const DISABLED_TOKENS = [
  'fms',
  'abg',
  'stjack',
  'noear',
  'testnebula',
  'susdc',
  'weth',
];

const USDT_SYMBOL = 'USDT';
const USDT_ALIAS_SYMBOL = 'USDT0';

export const isDisabledTokenSymbol = (symbol: string): boolean => {
  return DISABLED_TOKENS.includes(symbol.toLowerCase());
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
