import { createPublicClient, http } from 'viem';
import { arbitrum, base } from 'viem/chains';
import type { Chain, PublicClient } from 'viem';

import { RPC_URLS } from '@/config';

/** The chains Borrow reads Aave markets on (their RPCs: `RPC_URLS`). */
const CHAINS: Readonly<Record<number, Chain>> = {
  [base.id]: base,
  [arbitrum.id]: arbitrum,
};

const clients = new Map<number, PublicClient>();

/**
 * The public client for a market's chain: created on first use, then the same
 * instance for every later call. Throws for a chain Borrow has no RPC for.
 */
export const getClient = (chainId: number): PublicClient => {
  const cached = clients.get(chainId);

  if (cached) {
    return cached;
  }

  const chain = CHAINS[chainId];
  const url = RPC_URLS[chainId];

  if (!chain || !url) {
    throw new Error(`No RPC configured for chain ${chainId}`);
  }

  const client = createPublicClient({ chain, transport: http(url) });

  clients.set(chainId, client);

  return client;
};
