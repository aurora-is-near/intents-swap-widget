import { AAVE_V3_MARKETS } from '@/domains/markets/aaveV3/config/registry';

import type { PositionMarketRef } from '../types';
import type { VaultsFyiPosition } from './guards';

/** Borrow's chain slugs (`AaveMarket.chain`) as vaults.fyi names networks. */
const NETWORK_OF_CHAIN: Record<string, string> = {
  base: 'base',
  arb: 'arbitrum',
};

/** Network labels as the market list shows them; others are capitalised. */
const CHAIN_LABELS: Record<string, string> = {
  mainnet: 'Ethereum',
  bsc: 'BNB Chain',
};

/** Such as `Base` for `base`, `Arbitrum` for `arbitrum`. */
export const chainLabelOf = (network: string): string =>
  CHAIN_LABELS[network] ??
  AAVE_V3_MARKETS.find(({ chain }) => NETWORK_OF_CHAIN[chain] === network)
    ?.chainLabel ??
  `${network.charAt(0).toUpperCase()}${network.slice(1)}`;

/**
 * Borrow's Aave V3 markets as vaults.fyi refers to them: its network slug and
 * the market id, which for Aave V3 is the Pool address (the market's root),
 * checksummed: vaults.fyi answers 404 to a lowercase one.
 */
export const BORROW_MARKETS: readonly PositionMarketRef[] = AAVE_V3_MARKETS.map(
  ({ chain, pool }) => ({
    network: NETWORK_OF_CHAIN[chain] ?? chain,
    marketId: pool,
  }),
);

/** Whether a position is in one of Borrow's markets, so Borrow can manage it. */
export const isBorrowMarket = ({
  network,
  marketId,
}: Pick<VaultsFyiPosition, 'marketId'> & {
  network: { name: string };
}): boolean =>
  BORROW_MARKETS.some(
    (market) =>
      market.network === network.name &&
      market.marketId.toLowerCase() === marketId.toLowerCase(),
  );
