/**
 * The hosted `aave-v3-borrow` action Borrow runs its Aave borrows through, and
 * what the app needs to know about it ahead of a resolve:
 * - `BORROW_ACTION`: the pinned id, version and hash. Resolving with a hash
 *   the server no longer has answers 409, so a changed action is never run
 *   unreviewed; a new version means updating this pin.
 * - `AAVE_BORROW_MARKETS`: per chain, the tokens the action can supply or
 *   borrow, by the symbols its inputs take, with the reserve address and
 *   delivery coverage (`utils/coverage.ts`) matches Aave reserves on. They
 *   mirror the token tables of `actions/aave-v3-borrow-v1/script.star` in
 *   aurora-is-near/intents-connect-actions; the live contract test
 *   (`__tests__/borrowAction.contract.test.ts`) checks they still agree, and
 *   that the script's Pool and gateway are the registry's.
 *
 * Left out by the action: WETH as its own collateral (1Click quotes no
 * liquidity into it; ETH covers the reserve), WBTC on Arbitrum (not
 * delivered), USDT on Base (no reserve) and USDC as collateral (LTV 0).
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
};

/** The title the action files a borrow under (`execution.metadata.title`). */
export const aaveBorrowTitle = (
  market: { chainLabel: string },
  collateral: Pick<AaveBorrowToken, 'label'>,
  borrow: Pick<AaveBorrowToken, 'label'>,
): string =>
  `Borrow ${borrow.label} against ${collateral.label} on ${AAVE_MARKET_NAME} ${market.chainLabel}`;
