import { vi } from 'vitest';

import type {
  LoanPosition,
  PositionAsset,
  PositionMarketRef,
  PositionsReader,
} from '@/domains/positions/types';

export const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
export const EVM_WALLET = '0x00000000000000000000000000000000000000bb';
export const BASE_MARKET: PositionMarketRef = {
  network: 'base',
  marketId: '0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
};
export const ARB_MARKET: PositionMarketRef = {
  network: 'arbitrum',
  marketId: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
};

let fakeAssetCount = 0;

/** A reserve with its own id, so no two fake loans share a balance. */
export const fakeAsset = (
  symbol: string,
  amount: number,
  usd: number | null,
): PositionAsset => {
  fakeAssetCount += 1;

  return {
    id: `${symbol}-${fakeAssetCount}`,
    address: symbol.toLowerCase(),
    symbol,
    amount,
    usd,
  };
};

/** An active Aave V3 Base loan of `owner`: 1 WETH against 1,200 USDC. */
export const fakeLoan = (
  overrides: Partial<LoanPosition> = {},
): LoanPosition => {
  const owner = overrides.owner ?? INTERMEDIARY;
  const market = {
    network: overrides.network ?? BASE_MARKET.network,
    marketId: overrides.marketId ?? BASE_MARKET.marketId,
  };

  return {
    id: `${market.network}:${market.marketId}:${owner}`,
    provider: 'aave-v3',
    providerName: 'Aave',
    chainLabel: market.network === 'base' ? 'Base' : 'Arbitrum',
    marketName: 'Aave V3 Base',
    manageable: true,
    collateral: [fakeAsset('WETH', 1, 3000)],
    debt: [fakeAsset('USDC', 1200, 1200)],
    collateralUsd: 3000,
    debtUsd: 1200,
    ltv: 0.4,
    liquidationLtv: 0.83,
    health: 2.075,
    liquidationPrice: { symbol: 'WETH', usd: 1200 / 0.83 },
    borrowApr: 0.0485,
    interestPerYearUsd: 58.2,
    status: 'active',
    ...market,
    ...overrides,
    owner,
  };
};

/** A repaid loan: collateral left, no debt. */
export const fakeRepaidLoan = (
  overrides: Partial<LoanPosition> = {},
): LoanPosition =>
  fakeLoan({
    debt: [],
    debtUsd: 0,
    ltv: 0,
    health: null,
    liquidationPrice: null,
    borrowApr: null,
    interestPerYearUsd: null,
    status: 'repaid',
    collateral: [fakeAsset('WETH', 0.25, 750)],
    collateralUsd: 750,
    ...overrides,
  });

/**
 * A `PositionsReader` whose reads are mocks: by default the owner holds
 * nothing and every market is read without a loan.
 */
export const createFakePositionsReader = () =>
  ({
    readOwnerPositions: vi.fn(async (_owner: string) => [] as LoanPosition[]),
    readMarketPosition: vi.fn(
      async (_owner: string, _market: PositionMarketRef) =>
        null as LoanPosition | null,
    ),
    readMarketRisk: vi.fn(async (_market: PositionMarketRef) => ({
      assets: {},
    })),
    repaidMarkets: () => [BASE_MARKET, ARB_MARKET],
  }) satisfies PositionsReader;

/**
 * Stand-ins for whole-app tests, so no test reads vaults.fyi or looks up an
 * intermediary over the network: the App's reader is `reader`, and a
 * connected wallet's only owner account is `INTERMEDIARY`.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own calls:
 * `vi.mock('@/domains/positions/vaultsFyi/createVaultsFyiReader', async () => (await import('@/tests/fakePositions')).createVaultsFyiReaderMock(reader))`
 * and `vi.mock('@/domains/positions/hooks/useOwnerAccounts', async () => (await import('@/tests/fakePositions')).createOwnerAccountsMock())`.
 */
export const createVaultsFyiReaderMock = (
  reader: PositionsReader = createFakePositionsReader(),
) => ({ createVaultsFyiReader: () => reader });

export const createOwnerAccountsMock = async () => {
  const { useWallet } = await import('@/domains/wallet/hooks/useWallet');

  return {
    useOwnerAccounts: () => {
      const { address } = useWallet();

      return address
        ? {
            owners: [INTERMEDIARY],
            intermediary: INTERMEDIARY,
            status: 'success' as const,
            refetch: () => {},
          }
        : {
            owners: [],
            intermediary: undefined,
            status: 'idle' as const,
            refetch: () => {},
          };
    },
  };
};
