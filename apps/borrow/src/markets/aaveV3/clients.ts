import { type Chain, createPublicClient, http, type PublicClient } from 'viem';
import { arbitrum, base } from 'viem/chains';

import { RPC_URL_ARB, RPC_URL_BASE } from '../../config';

/** The chains Borrow reads Aave markets on, with their RPC URLs. */
const CHAINS: Readonly<Record<number, { chain: Chain; url: string }>> = {
  [base.id]: { chain: base, url: RPC_URL_BASE },
  [arbitrum.id]: { chain: arbitrum, url: RPC_URL_ARB },
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

  const entry = CHAINS[chainId];

  if (!entry) {
    throw new Error(`No RPC configured for chain ${chainId}`);
  }

  const client = createPublicClient({
    chain: entry.chain,
    transport: http(entry.url),
  });

  clients.set(chainId, client);

  return client;
};
