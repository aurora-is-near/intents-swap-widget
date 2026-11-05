/**
 * Aave V3 markets on chains Intents Connect can run steps on, keyed by the
 * `marketName` app.aave.com uses (its URL and `selectedMarket`). Others —
 * Mantle, Ink, Linea, MegaETH, Celo, Horizon, Aptos and the V4 markets —
 * are not supported yet.
 */
type AaveMarket = {
  name: string;
  /** As the page's market selector labels it. */
  label: string;
  /** The SDK's chain slug (EVM_CHAIN_IDS). */
  chain: string;
  chainLabel: string;
};

const market = (
  name: string,
  label: string,
  chain: string,
  chainLabel = label,
): AaveMarket => ({ name, label, chain, chainLabel });

const MARKETS: Record<string, AaveMarket> = Object.fromEntries(
  [
    market('proto_mainnet_v3', 'Core', 'eth', 'Ethereum'),
    market('proto_lido_v3', 'Prime', 'eth', 'Ethereum'),
    market('proto_base_v3', 'Base', 'base'),
    market('proto_arbitrum_v3', 'Arbitrum', 'arb'),
    market('proto_optimism_v3', 'OP', 'op'),
    market('proto_polygon_v3', 'Polygon', 'pol'),
    market('proto_avalanche_v3', 'Avalanche', 'avax'),
    market('proto_bnb_v3', 'BNB Chain', 'bsc'),
    market('proto_gnosis_v3', 'Gnosis', 'gnosis'),
    market('proto_plasma_v3', 'Plasma', 'plasma'),
    market('proto_monad_v3', 'Monad', 'monad'),
    market('proto_xlayer_v3', 'X Layer', 'xlayer'),
  ].map((entry) => [entry.name, entry]),
);

export const getAaveMarket = (name: string): AaveMarket | undefined =>
  MARKETS[name];

/** "Core V3 · Ethereum", or "Base V3" where the market is named after its chain. */
export const marketTitle = ({ label, chainLabel }: AaveMarket) =>
  label === chainLabel ? `${label} V3` : `${label} V3 · ${chainLabel}`;
