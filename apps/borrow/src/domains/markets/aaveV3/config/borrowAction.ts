/**
 * The hosted `aave-v3-borrow` action Borrow runs its Aave borrows through, and
 * what the app needs to know about it ahead of a resolve:
 * - `BORROW_ACTION`: the pinned id, version and hash. Resolving with a hash
 *   the server no longer has answers 409, so a changed action is never run
 *   unreviewed; a new version means updating this pin.
 * - `AAVE_BORROW_MARKETS`: per chain, the tokens the action can supply or
 *   borrow, by the symbols its inputs take, with the reserve address and
 *   delivery coverage (`utils/coverage.ts`) matches Aave reserves on. They
 *   mirror the token tables of `actions/aave-v3-borrow-v2/script.star` in
 *   aurora-is-near/intents-connect-actions; the live contract test
 *   (`__tests__/borrowAction.contract.test.ts`) checks they still agree, and
 *   that the script's Pool and gateway are the registry's.
 *
 * Native collateral (ETH, POL) is delivered as the chain's gas
 * token and supplied as its wrapped reserve through Aave's gateway.
 *
 * Optimism, Avalanche and BNB Chain have Aave V3 markets too, but Intents
 * Connect does not run steps there yet (as of 2026-11-27, alpha API), so the
 * action leaves them out.
 *
 * Left out by the action: WETH as its own collateral (1Click quotes no
 * liquidity into it on Base or Arbitrum; ETH covers the reserve; Polygon's
 * ERC-20 WETH waits on a dry run), reserves 1Click does not deliver (WBTC on
 * Arbitrum and Polygon; wstETH), USDT on Base (no reserve) and stablecoins
 * as collateral (LTV 0).
 */

export const BORROW_ACTION = {
  id: 'aave-v3-borrow',
  version: 2,
  sha256Hash:
    '5ccfbbdb08e6842621d1b64f08038b52e45d69dd712707c7e28c5ad70f753f02',
} as const;

/** What every borrow is filed as (`execution.metadata.intent`). */
export const AAVE_BORROW_INTENT = 'aave_borrow';

/** As Borrow names the market (`LendingMarket.name`). */
const AAVE_MARKET_NAME = 'Aave';

/** The action's `chain` input: backend chain identifiers. */
export const AAVE_BORROW_CHAINS = ['base', 'arb', 'pol'] as const;
export type AaveBorrowChain = (typeof AAVE_BORROW_CHAINS)[number];

/** The action's `borrowAsset` input. */
export const AAVE_BORROW_ASSETS = ['USDC', 'USDT'] as const;
export type AaveBorrowAsset = (typeof AAVE_BORROW_ASSETS)[number];

/** The action's `collateral` input. */
export const AAVE_COLLATERAL_ASSETS = ['ETH', 'cbBTC', 'POL'] as const;
export type AaveCollateralAsset = (typeof AAVE_COLLATERAL_ASSETS)[number];

export type AaveBorrowToken = {
  /**
   * As 1Click lists the token, which Borrow shows and puts in its ids and
   * titles. Differs from the input symbol for Arbitrum's USDT, listed as
   * USDT0.
   */
  label: string;
  /**
   * The Aave reserve. For the native token, the wrapped reserve the gateway
   * supplies.
   */
  address: string;
  /** Delivered as the chain's gas token and supplied through the gateway. */
  native: boolean;
};

export type AaveBorrowMarket = {
  borrow: Readonly<Partial<Record<AaveBorrowAsset, AaveBorrowToken>>>;
  collateral: Readonly<Partial<Record<AaveCollateralAsset, AaveBorrowToken>>>;
};

export const AAVE_BORROW_MARKETS: Readonly<
  Record<AaveBorrowChain, AaveBorrowMarket>
> = {
  base: {
    borrow: {
      USDC: {
        label: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        native: false,
      },
    },
    collateral: {
      ETH: {
        label: 'ETH',
        address: '0x4200000000000000000000000000000000000006',
        native: true,
      },
      cbBTC: {
        label: 'cbBTC',
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        native: false,
      },
    },
  },
  arb: {
    borrow: {
      USDC: {
        label: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        native: false,
      },
      USDT: {
        label: 'USDT0',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        native: false,
      },
    },
    collateral: {
      ETH: {
        label: 'ETH',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        native: true,
      },
    },
  },
  pol: {
    borrow: {
      USDC: {
        label: 'USDC',
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        native: false,
      },
      USDT: {
        label: 'USDT',
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        native: false,
      },
    },
    collateral: {
      POL: {
        label: 'POL',
        address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        native: true,
      },
    },
  },
};

/** The title the action files a borrow under (`execution.metadata.title`). */
export const aaveBorrowTitle = (
  market: { chainLabel: string },
  collateral: Pick<AaveBorrowToken, 'label'>,
  borrow: Pick<AaveBorrowToken, 'label'>,
): string =>
  `Borrow ${borrow.label} against ${collateral.label} on ${AAVE_MARKET_NAME} ${market.chainLabel}`;
