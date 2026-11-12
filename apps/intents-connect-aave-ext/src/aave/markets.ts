import type { Address } from 'viem';

/**
 * Aave V3 markets Intents Connect can deliver into, keyed by the
 * `marketName` app.aave.com uses (its URL and `selectedMarket`). A market
 * qualifies when the service can deliver tokens on its chain: on OP,
 * Avalanche, BNB Chain, Gnosis, Plasma, X Layer and the rest it delivers
 * nothing yet.
 *
 * Addresses (POOL, AAVE_PROTOCOL_DATA_PROVIDER, WETH_GATEWAY and the wrapped
 * native asset): @bgd-labs/aave-address-book 4.44.22 (AaveV3Ethereum,
 * AaveV3EthereumLido, AaveV3Base, AaveV3Arbitrum, AaveV3Polygon); Monad's,
 * which the book doesn't have yet, from apps/intents-connect-demo.
 */
export type AaveMarket = {
  name: string;
  /** As the page's market selector labels it. */
  label: string;
  /** The SDK's chain slug (EVM_CHAIN_IDS). */
  chain: 'eth' | 'base' | 'arb' | 'pol' | 'monad';
  chainLabel: string;
  pool: Address;
  /** AaveProtocolDataProvider: reserves, their state and rates. */
  dataProvider: Address;
  /**
   * The wrapped native token's reserve and the WrappedTokenGatewayV3 that
   * supplies it from the native token, as Aave's own "Supply ETH" does.
   */
  native?: { symbol: string; reserve: Address; gateway: Address };
};

const MARKETS: Record<string, AaveMarket> = Object.fromEntries(
  (
    [
      {
        name: 'proto_mainnet_v3',
        label: 'Core',
        chain: 'eth',
        chainLabel: 'Ethereum',
        pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        dataProvider: '0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD',
        native: {
          symbol: 'ETH',
          reserve: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          gateway: '0xd01607c3C5eCABa394D8be377a08590149325722',
        },
      },
      {
        name: 'proto_lido_v3',
        label: 'Prime',
        chain: 'eth',
        chainLabel: 'Ethereum',
        pool: '0x4e033931ad43597d96D6bcc25c280717730B58B1',
        dataProvider: '0xB85B2bFEbeC4F5f401dbf92ac147A3076391fCD5',
        native: {
          symbol: 'ETH',
          reserve: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          gateway: '0x3167C452fA3fa1e5C16bB83Bc0fde4519C464299',
        },
      },
      {
        name: 'proto_base_v3',
        label: 'Base',
        chain: 'base',
        chainLabel: 'Base',
        pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
        dataProvider: '0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A',
        native: {
          symbol: 'ETH',
          reserve: '0x4200000000000000000000000000000000000006',
          gateway: '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24',
        },
      },
      {
        name: 'proto_arbitrum_v3',
        label: 'Arbitrum',
        chain: 'arb',
        chainLabel: 'Arbitrum',
        pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        dataProvider: '0x243Aa95cAC2a25651eda86e80bEe66114413c43b',
        native: {
          symbol: 'ETH',
          reserve: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          gateway: '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF',
        },
      },
      {
        name: 'proto_polygon_v3',
        label: 'Polygon',
        chain: 'pol',
        chainLabel: 'Polygon',
        pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        dataProvider: '0x243Aa95cAC2a25651eda86e80bEe66114413c43b',
        native: {
          symbol: 'POL',
          reserve: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          gateway: '0xBC302053db3aA514A3c86B9221082f162B91ad63',
        },
      },
      {
        name: 'proto_monad_v3',
        label: 'Monad',
        chain: 'monad',
        chainLabel: 'Monad',
        pool: '0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef',
        dataProvider: '0xB65A68B98274ef7D9a60E0C0747dD1BEc3D32fad',
      },
    ] satisfies AaveMarket[]
  ).map((entry) => [entry.name, entry]),
);

export const getAaveMarket = (name: string): AaveMarket | undefined =>
  MARKETS[name];

/** "Core V3 · Ethereum", or "Base V3" where the market is named after its chain. */
export const marketTitle = ({ label, chainLabel }: AaveMarket) =>
  label === chainLabel ? `${label} V3` : `${label} V3 · ${chainLabel}`;
