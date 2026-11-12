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

const EXPLORER_TX: Record<string, string> = {
  eth: 'https://etherscan.io/tx/',
  base: 'https://basescan.org/tx/',
  arb: 'https://arbiscan.io/tx/',
  op: 'https://optimistic.etherscan.io/tx/',
  pol: 'https://polygonscan.com/tx/',
  bsc: 'https://bscscan.com/tx/',
  avax: 'https://snowtrace.io/tx/',
  gnosis: 'https://gnosisscan.io/tx/',
  monad: 'https://monadscan.com/tx/',
  sol: 'https://solscan.io/tx/',
  near: 'https://nearblocks.io/txns/',
  stellar: 'https://stellar.expert/explorer/public/tx/',
  tron: 'https://tronscan.org/#/transaction/',
  ton: 'https://tonviewer.com/transaction/',
};

/** A transaction on its chain's explorer, where one is known. */
export const explorerTxUrl = (
  blockchain: string,
  hash: string,
): string | undefined =>
  EXPLORER_TX[blockchain] ? `${EXPLORER_TX[blockchain]}${hash}` : undefined;
