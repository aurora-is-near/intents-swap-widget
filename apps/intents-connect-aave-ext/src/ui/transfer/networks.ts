/**
 * Networks as exchanges name them in their withdrawal forms, where the token
 * standard tells USDT on Ethereum (ERC-20) from USDT on TRON (TRC-20).
 */
const EXCHANGE_NETWORK: Partial<Record<string, string>> = {
  eth: 'Ethereum (ERC-20)',
  bsc: 'BNB Smart Chain (BEP-20)',
  tron: 'TRON (TRC-20)',
  arb: 'Arbitrum One',
  op: 'Optimism',
  base: 'Base',
  pol: 'Polygon',
  avax: 'Avalanche C-Chain',
  sol: 'Solana',
  near: 'NEAR',
  gnosis: 'Gnosis',
  scroll: 'Scroll',
  monad: 'Monad',
  bera: 'Berachain',
  plasma: 'Plasma',
  xlayer: 'X Layer',
};

/** The network to pick in an exchange's withdrawal form. */
export const exchangeNetwork = (
  blockchain: string,
  chainName: (blockchain: string) => string,
): string => EXCHANGE_NETWORK[blockchain] ?? chainName(blockchain);
