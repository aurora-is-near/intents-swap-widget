/**
 * The `aave-v3-borrow` action's tables: per chain, the Aave V3 Pool, the
 * WETH gateway, and the tokens that can be borrowed or supplied. `script.star`
 * holds the same tables; a change here is a change there (and a new action
 * version once deployed).
 *
 * Sources, checked 2026-11-25:
 * - Pool, WETH_GATEWAY and each token's UNDERLYING and decimals:
 *   @bgd-labs/aave-address-book 4.44.22, `AaveV3Base` and `AaveV3Arbitrum`
 *   (the same version `apps/borrow/src/markets/aaveV3/registry.ts` uses).
 *   Arbitrum's USDC is the book's `USDCn` (native USDC), not its `USDC`
 *   (bridged USDC.e, 0xFF970A61…).
 * - Asset ids and labels: the 1Click token list
 *   (`https://1click.chaindefuser.com/v0/tokens`), matched by chain and
 *   contract address; the native token by its empty contract address.
 *
 * Left out (reported in the PR):
 * - WBTC on Arbitrum: an Aave reserve, but 1Click does not deliver it (no
 *   `arb` token at 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f in the 1Click
 *   list, nor in Intents Connect's `supported_tokens`).
 * - USDT on Base: Aave V3 on Base has no USDT reserve.
 * - USDC as collateral, on both chains: Aave gives it an LTV of 0 (read
 *   through each chain's AaveProtocolDataProvider,
 *   `getReserveConfigurationData`), so it backs no borrow and `borrow` would
 *   revert after the collateral was bridged and supplied. The Borrow app
 *   likewise counts a reserve as collateral only when its LTV is above 0.
 *   USDC stays borrowable.
 */

/** What every borrow is filed as (`execution.metadata.intent`). */
export const AAVE_BORROW_INTENT = 'aave_borrow';

/** As the Borrow app names the market (`LendingMarket.name`). */
export const AAVE_MARKET_NAME = 'Aave';

/** The action's `chain` input: backend chain identifiers. */
export const AAVE_BORROW_CHAINS = ['base', 'arb'] as const;
export type AaveBorrowChain = (typeof AAVE_BORROW_CHAINS)[number];

/** The action's `borrowAsset` input: every borrow table's symbols. */
export const AAVE_BORROW_ASSETS = ['USDC', 'USDT'] as const;
export type AaveBorrowAsset = (typeof AAVE_BORROW_ASSETS)[number];

/** The action's `collateral` input: every collateral table's symbols. */
export const AAVE_COLLATERAL_ASSETS = ['ETH', 'WETH', 'cbBTC'] as const;
export type AaveCollateralAsset = (typeof AAVE_COLLATERAL_ASSETS)[number];

export type AaveBorrowToken = {
  /**
   * As 1Click lists the token, which is what the Borrow app shows and puts
   * in its titles. Differs from the input symbol for Arbitrum's USDT, which
   * 1Click lists as USDT0 (the same contract).
   */
  label: string;
  /**
   * The Aave reserve. For the native token it is the wrapped reserve the
   * gateway supplies; nothing is called on it.
   */
  address: string;
  decimals: number;
  /** Delivered as the chain's gas token and supplied through the gateway. */
  native: boolean;
  /** The 1Click asset id the bridge delivers it as. */
  assetId: string;
};

export type AaveBorrowMarket = {
  chain: AaveBorrowChain;
  /** As the Borrow app labels the chain (`LendingMarket.chainLabel`). */
  chainLabel: string;
  pool: string;
  /** WrappedTokenGatewayV3: supplies the native token as its wrapped reserve. */
  gateway: string;
  borrow: Readonly<Partial<Record<AaveBorrowAsset, AaveBorrowToken>>>;
  collateral: Readonly<Partial<Record<AaveCollateralAsset, AaveBorrowToken>>>;
};

const BASE_USDC: AaveBorrowToken = {
  label: 'USDC',
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  decimals: 6,
  native: false,
  assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
};

const BASE_WETH = '0x4200000000000000000000000000000000000006';

const ARB_USDC: AaveBorrowToken = {
  label: 'USDC',
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  decimals: 6,
  native: false,
  assetId: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
};

const ARB_WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

export const AAVE_BORROW_MARKETS: Readonly<
  Record<AaveBorrowChain, AaveBorrowMarket>
> = {
  base: {
    chain: 'base',
    chainLabel: 'Base',
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    gateway: '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24',
    borrow: {
      USDC: BASE_USDC,
    },
    collateral: {
      ETH: {
        label: 'ETH',
        address: BASE_WETH,
        decimals: 18,
        native: true,
        assetId: 'nep141:base.omft.near',
      },
      WETH: {
        label: 'WETH',
        address: BASE_WETH,
        decimals: 18,
        native: false,
        assetId:
          'nep141:base-0x4200000000000000000000000000000000000006.omft.near',
      },
      cbBTC: {
        label: 'cbBTC',
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        decimals: 8,
        native: false,
        assetId:
          'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near',
      },
    },
  },
  arb: {
    chain: 'arb',
    chainLabel: 'Arbitrum',
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    gateway: '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF',
    borrow: {
      USDC: ARB_USDC,
      USDT: {
        label: 'USDT0',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        native: false,
        assetId:
          'nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near',
      },
    },
    collateral: {
      ETH: {
        label: 'ETH',
        address: ARB_WETH,
        decimals: 18,
        native: true,
        assetId: 'nep141:arb.omft.near',
      },
      WETH: {
        label: 'WETH',
        address: ARB_WETH,
        decimals: 18,
        native: false,
        assetId:
          'nep141:arb-0x82af49447d8a07e3bd95bd0d56f35241523fbab1.omft.near',
      },
    },
  },
};
