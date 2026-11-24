import { QueryClient } from '@tanstack/react-query';
import { type Mock, vi } from 'vitest';

import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from '../markets/types';

/**
 * One fake lending adapter and its data for every test that needs markets:
 * the market hooks, the market list and the App-level tests. Two markets,
 * Base and Arbitrum, each with the default pair (WETH / USDC).
 */

const fakeMarket = (
  chain: string,
  chainId: number,
  chainLabel: string,
): LendingMarket => ({
  id: `fake:${chain}`,
  provider: 'fake',
  name: 'Aave',
  chain,
  chainId,
  chainLabel,
});

export const FAKE_BASE = fakeMarket('base', 8453, 'Base');
export const FAKE_ARB = fakeMarket('arb', 42161, 'Arbitrum');

/** The oracle's unit: one dollar in 8 decimals, as on Aave. */
export const USD = 100_000_000n;

export const weth = (
  overrides: Partial<CollateralReserve> = {},
): CollateralReserve => ({
  asset: '0x0000000000000000000000000000000000000001',
  symbol: 'WETH',
  decimals: 18,
  assetId: 'nep141:weth',
  maxLtvBps: 7900,
  liquidationLtvBps: 8100,
  priceBase: 3_000n * USD,
  ...overrides,
});

/**
 * Native ETH delivered and supplied as WETH through Aave's gateway, as the
 * Aave adapter reads Base's and Arbitrum's wrapped-native reserve.
 */
export const nativeEth = (
  overrides: Partial<CollateralReserve> = {},
): CollateralReserve =>
  weth({
    asset: '0x0000000000000000000000000000000000000003',
    symbol: 'ETH',
    assetId: 'nep141:eth',
    nativeDelivery: true,
    ...overrides,
  });

export const usdc = (
  overrides: Partial<BorrowReserve> = {},
): BorrowReserve => ({
  asset: '0x0000000000000000000000000000000000000002',
  symbol: 'USDC',
  decimals: 6,
  assetId: 'nep141:usdc',
  variableBorrowApr: 0.0485,
  availableLiquidity: 1_200_000_000n * 10n ** 6n,
  priceBase: USD,
  ...overrides,
});

/** A snapshot of `market` with the default pair, or the reserves given. */
export const pairSnapshot = (
  market: LendingMarket,
  reserves: Partial<Pick<MarketSnapshot, 'collateral' | 'borrowable'>> = {},
): MarketSnapshot => ({
  market,
  blockNumber: 1n,
  baseCurrencyUnit: USD,
  collateral: [weth()],
  borrowable: [usdc()],
  ...reserves,
});

/**
 * Base at 4.85%, max LTV 79%, liquidation 81%, $1.2B; Arbitrum at 4.41%,
 * 80%, 82.5%, $356M: Aave's and Spark's figures on the artboard.
 */
export const FAKE_SNAPSHOTS: Readonly<Record<string, MarketSnapshot>> = {
  [FAKE_BASE.id]: pairSnapshot(FAKE_BASE),
  [FAKE_ARB.id]: pairSnapshot(FAKE_ARB, {
    collateral: [weth({ maxLtvBps: 8000, liquidationLtvBps: 8250 })],
    borrowable: [
      usdc({
        variableBorrowApr: 0.0441,
        availableLiquidity: 356_000_000n * 10n ** 6n,
      }),
    ],
  }),
};

/** `FAKE_SNAPSHOTS`' entry for a market; rejects for any other market. */
export const readFakeSnapshot = async (
  market: LendingMarket,
): Promise<MarketSnapshot> => {
  const found = FAKE_SNAPSHOTS[market.id];

  if (!found) {
    throw new Error(`no snapshot for ${market.id}`);
  }

  return found;
};

export type FakeAdapter = LendingMarketAdapter & {
  listMarkets: Mock<LendingMarketAdapter['listMarkets']>;
  getMarketSnapshot: Mock<LendingMarketAdapter['getMarketSnapshot']>;
  buildBorrowSteps: Mock<LendingMarketAdapter['buildBorrowSteps']>;
};

type FakeAdapterOptions = {
  id?: string;
  listMarkets?: LendingMarketAdapter['listMarkets'];
  getMarketSnapshot?: LendingMarketAdapter['getMarketSnapshot'];
  buildBorrowSteps?: LendingMarketAdapter['buildBorrowSteps'];
};

/**
 * An adapter listing Base and Arbitrum and reading `FAKE_SNAPSHOTS`, unless
 * told otherwise; it builds no borrow steps. Every method is a mock, so a
 * test can count or replace the calls.
 */
export const createFakeAdapter = ({
  id = 'fake',
  listMarkets = () => Promise.resolve([FAKE_BASE, FAKE_ARB]),
  getMarketSnapshot = readFakeSnapshot,
  buildBorrowSteps = () => [],
}: FakeAdapterOptions = {}): FakeAdapter => ({
  id,
  name: 'Aave',
  listMarkets: vi.fn(listMarkets),
  getMarketSnapshot: vi.fn(getMarketSnapshot),
  buildBorrowSteps: vi.fn(buildBorrowSteps),
});

/**
 * A query client that does not retry, so a failure shows at once. Queries
 * that set their own retry, such as the market snapshots, run it without
 * delay.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
