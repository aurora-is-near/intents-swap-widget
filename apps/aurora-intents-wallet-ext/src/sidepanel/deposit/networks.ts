import type { Chains } from '@aurora-is-near/intents-swap-widget';

export type DepositNetwork = {
  /** The fee service's `depositChain`; `evm` covers every EVM chain. */
  id: 'evm' | Chains;
  title: string;
  /** The chains this address accepts deposits on. */
  chains: Chains[];
};

/** One address for every EVM chain, then one per other network. */
export const EVM_NETWORK: DepositNetwork = {
  id: 'evm',
  title: 'EVM address',
  chains: ['eth', 'base', 'arb', 'bsc', 'pol', 'op', 'avax'],
};

export const OTHER_NETWORKS: DepositNetwork[] = (
  [
    ['sol', 'Solana'],
    ['near', 'NEAR'],
    ['btc', 'Bitcoin'],
    ['ton', 'TON'],
    ['tron', 'Tron'],
    ['stellar', 'Stellar'],
    ['sui', 'Sui'],
    ['xrp', 'XRP Ledger'],
  ] as const
).map(([id, title]) => ({ id, title, chains: [id] }));

export const findNetwork = (id: DepositNetwork['id']) =>
  [EVM_NETWORK, ...OTHER_NETWORKS].find((network) => network.id === id) ??
  EVM_NETWORK;
