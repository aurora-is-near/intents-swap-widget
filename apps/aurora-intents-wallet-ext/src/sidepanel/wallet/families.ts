import type { WalletFamily } from './types';

/** What a connected wallet of each family can be used on. */
export const FAMILY_NETWORKS: Record<WalletFamily, string> = {
  evm: 'EVM networks',
  sol: 'Solana',
  near: 'NEAR',
};
