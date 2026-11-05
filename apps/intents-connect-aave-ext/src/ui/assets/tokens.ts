import {
  CHAINS_LIST,
  TOKENS,
} from '@aurora-is-near/intents-swap-widget/constants';

/** The swap widget's icon for a symbol, if it has one. */
export const tokenIcon = (symbol: string): string | undefined =>
  TOKENS[symbol.toLowerCase()]?.icon;

/** "Base" for `base`; the slug itself for a chain the widget doesn't list. */
export const chainLabel = (blockchain: string): string =>
  (CHAINS_LIST as Partial<Record<string, { label: string }>>)[blockchain]
    ?.label ?? blockchain;
