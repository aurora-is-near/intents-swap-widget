/**
 * Chain names and dots by 1Click slug: the artboard's `CH` (Web-Borrow.dc.html
 * line 1099) for the four it draws; other chains get their slug's name and
 * the "All chains" grey.
 */
const CHAINS: Record<string, { name: string; color: string }> = {
  eth: { name: 'Ethereum', color: '#5B74D6' },
  base: { name: 'Base', color: '#2E6BFF' },
  arb: { name: 'Arbitrum', color: '#1F8FD6' },
  op: { name: 'Optimism', color: '#D9341F' },
  pol: { name: 'Polygon', color: '#8A928C' },
  avax: { name: 'Avalanche', color: '#8A928C' },
  bsc: { name: 'BNB Chain', color: '#8A928C' },
  gnosis: { name: 'Gnosis', color: '#8A928C' },
  sol: { name: 'Solana', color: '#8A928C' },
  near: { name: 'NEAR', color: '#8A928C' },
};

/** "All chains" (line 1165). */
export const ALL_CHAINS_COLOR = '#8A928C';

/** A chain's name and dot colour by its 1Click slug. */
export const chainOf = (slug: string) =>
  CHAINS[slug] ?? {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    color: ALL_CHAINS_COLOR,
  };
