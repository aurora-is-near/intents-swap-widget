/**
 * The hosted `aave-v3-borrow` action Borrow runs its Aave borrows through, and
 * what the app needs to know about it ahead of a resolve:
 * - `BORROW_ACTION`: the pinned id, version and hash. Resolving with a hash
 *   the server no longer has answers 409, so a changed action is never run
 *   unreviewed; a new version means updating this pin.
 * - `AAVE_BORROW_MARKETS`: per chain, the Pool, the gateway and the tokens the
 *   action can supply or borrow, by the symbols its inputs take. Coverage
 *   (`utils/coverage.ts`) matches Aave reserves against them, and a recipe's
 *   destination comes from them. They mirror the action's own tables in
 *   `actions/aave-v3-borrow-v1/script.star` of
 *   aurora-is-near/intents-connect-actions; the live contract test
 *   (`__tests__/borrowAction.contract.test.ts`) checks the two still agree.
 *
 * Sources, checked 2026-11-25: Pool, gateway, token addresses and decimals
 * from @bgd-labs/aave-address-book 4.44.22 (`AaveV3Base`, `AaveV3Arbitrum`;
 * Arbitrum's USDC is the book's `USDCn`, not bridged USDC.e); asset ids and
 * labels from the 1Click token list. Left out by the action: WETH as its own
 * collateral (1Click quotes no liquidity into it; ETH covers the reserve),
 * WBTC on Arbitrum (not delivered), USDT on Base (no reserve) and USDC as
 * collateral (LTV 0).
 */

export const BORROW_ACTION = {
  id: 'aave-v3-borrow',
  version: 1,
  sha256Hash:
    'cf4a065b25d026dbf38b8724ced0d58642309f404672e552d038fa3e64b983fa',
} as const;

/** What every borrow is filed as (`execution.metadata.intent`). */
export const AAVE_BORROW_INTENT = 'aave_borrow';

/** As Borrow names the market (`LendingMarket.name`). */
const AAVE_MARKET_NAME = 'Aave';

/** The action's `chain` input: backend chain identifiers. */
export const AAVE_BORROW_CHAINS = ['base', 'arb'] as const;
export type AaveBorrowChain = (typeof AAVE_BORROW_CHAINS)[number];

/** The action's `borrowAsset` input. */
export const AAVE_BORROW_ASSETS = ['USDC', 'USDT'] as const;
export type AaveBorrowAsset = (typeof AAVE_BORROW_ASSETS)[number];

/** The action's `collateral` input. */
export const AAVE_COLLATERAL_ASSETS = ['ETH', 'cbBTC'] as const;
export type AaveCollateralAsset = (typeof AAVE_COLLATERAL_ASSETS)[number];

export type AaveBorrowToken = {
  /**
   * As 1Click lists the token, which Borrow shows and puts in its titles.
   * Differs from the input symbol for Arbitrum's USDT, listed as USDT0.
   */
  label: string;
  /**
   * The Aave reserve. For the native token, the wrapped reserve the gateway
   * supplies.
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
  /** As Borrow labels the chain (`LendingMarket.chainLabel`). */
  chainLabel: string;
  pool: string;
  /** WrappedTokenGatewayV3: supplies the native token as its wrapped reserve. */
  gateway: string;
  borrow: Readonly<Partial<Record<AaveBorrowAsset, AaveBorrowToken>>>;
  collateral: Readonly<Partial<Record<AaveCollateralAsset, AaveBorrowToken>>>;
};

const BASE_WETH = '0x4200000000000000000000000000000000000006';
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
      USDC: {
        label: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        native: false,
        assetId:
          'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
      },
    },
    collateral: {
      ETH: {
        label: 'ETH',
        address: BASE_WETH,
        decimals: 18,
        native: true,
        assetId: 'nep141:base.omft.near',
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
      USDC: {
        label: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
        native: false,
        assetId:
          'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
      },
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
    },
  },
};

/** The title the action files a borrow under (`execution.metadata.title`). */
export const aaveBorrowTitle = (
  market: Pick<AaveBorrowMarket, 'chainLabel'>,
  collateral: Pick<AaveBorrowToken, 'label'>,
  borrow: Pick<AaveBorrowToken, 'label'>,
): string =>
  `Borrow ${borrow.label} against ${collateral.label} on ${AAVE_MARKET_NAME} ${market.chainLabel}`;
