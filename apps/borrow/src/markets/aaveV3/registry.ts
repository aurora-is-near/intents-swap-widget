import type { Address } from 'viem';

/**
 * Lifted from `apps/intents-connect-aave-ext/src/aave/markets.ts` (copied,
 * not imported: apps don't import from each other), narrowed to Borrow's
 * launch chains, Base and Arbitrum, with `chainId` and the Aave oracle added.
 *
 * Aave V3 markets, each named by the `marketName` app.aave.com uses (its URL
 * and `selectedMarket`).
 *
 * Addresses (POOL, AAVE_PROTOCOL_DATA_PROVIDER, ORACLE, WETH_GATEWAY and the
 * wrapped native asset's UNDERLYING): @bgd-labs/aave-address-book 4.44.22
 * (AaveV3Base, AaveV3Arbitrum). Aave replaces the data provider on protocol
 * upgrades, so a book bump means re-checking these by hand.
 */
export type AaveMarket = {
  name: string;
  /** As app.aave.com's market selector labels it. */
  label: string;
  /** The SDK's chain slug (EVM_CHAIN_IDS). */
  chain: 'base' | 'arb';
  chainId: number;
  chainLabel: string;
  pool: Address;
  /** AaveProtocolDataProvider: reserves, their state and rates. */
  dataProvider: Address;
  /** AaveOracle: the reserve prices Aave liquidates on (`getAssetsPrices`). */
  oracle: Address;
  /**
   * The wrapped native token's reserve and the WrappedTokenGatewayV3 that
   * supplies it from the native token, as Aave's own "Supply ETH" does.
   */
  native?: { symbol: string; reserve: Address; gateway: Address };
};

export const AAVE_V3_MARKETS: readonly AaveMarket[] = [
  {
    name: 'proto_base_v3',
    label: 'Base',
    chain: 'base',
    chainId: 8453,
    chainLabel: 'Base',
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    dataProvider: '0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A',
    oracle: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156',
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
    chainId: 42161,
    chainLabel: 'Arbitrum',
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    dataProvider: '0x243Aa95cAC2a25651eda86e80bEe66114413c43b',
    oracle: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7',
    native: {
      symbol: 'ETH',
      reserve: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      gateway: '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF',
    },
  },
];

export const getAaveMarket = (name: string): AaveMarket | undefined =>
  AAVE_V3_MARKETS.find((market) => market.name === name);
