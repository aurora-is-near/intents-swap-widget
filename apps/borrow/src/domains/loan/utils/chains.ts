/** "All chains" (line 1165). */
export const ALL_CHAINS_COLOR = '#8A928C';

/**
 * Chain names and dots by 1Click slug: the artboard's `CH` (Web-Borrow.dc.html
 * line 1099) for the four it draws, and Polygon's brand colour for its Aave
 * market; other chains get their slug's name and the "All chains" grey.
 */
const CHAINS: Record<string, { name: string; color: string }> = {
  eth: { name: 'Ethereum', color: '#5B74D6' },
  base: { name: 'Base', color: '#2E6BFF' },
  arb: { name: 'Arbitrum', color: '#1F8FD6' },
  op: { name: 'Optimism', color: '#D9341F' },
  pol: { name: 'Polygon', color: '#8247E5' },
  avax: { name: 'Avalanche', color: ALL_CHAINS_COLOR },
  bsc: { name: 'BNB Chain', color: ALL_CHAINS_COLOR },
  gnosis: { name: 'Gnosis', color: ALL_CHAINS_COLOR },
  sol: { name: 'Solana', color: ALL_CHAINS_COLOR },
  near: { name: 'NEAR', color: ALL_CHAINS_COLOR },
  stellar: { name: 'Stellar', color: ALL_CHAINS_COLOR },
};

/** A chain's name and dot colour by its 1Click slug. */
export const chainOf = (slug: string) =>
  CHAINS[slug] ?? {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    color: ALL_CHAINS_COLOR,
  };
