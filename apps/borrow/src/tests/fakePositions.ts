import { vi } from 'vitest';

import type { LendingMarket } from '../markets/types';
import type {
  LoanPosition,
  PositionMarketRisk,
  PositionsReader,
} from '../positions/types';

export const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
export const EVM_WALLET = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

/** Borrow's markets as the Aave V3 adapter lists them. */
export const AAVE_BASE: LendingMarket = {
  id: 'aave-v3:base',
  provider: 'aave-v3',
  name: 'Aave',
  chain: 'base',
  chainId: 8453,
  chainLabel: 'Base',
};

export const AAVE_ARB: LendingMarket = {
  id: 'aave-v3:arb',
  provider: 'aave-v3',
  name: 'Aave',
  chain: 'arb',
  chainId: 42161,
  chainLabel: 'Arbitrum',
};

/** An active WETH / USDC loan, $3,000 collateral and $1,500 debt. */
export const loanPosition = (
  overrides: Partial<LoanPosition> = {},
): LoanPosition => {
  const owner = overrides.owner ?? INTERMEDIARY;
  const network = overrides.network ?? 'base';
  const marketId = overrides.marketId ?? 'aave-v3-base';

  return {
    id: `aave-v3:${network}:${marketId}:${owner}`,
    provider: 'aave-v3',
    providerName: 'Aave',
    network,
    marketId,
    chainLabel: 'Base',
    marketName: 'Aave V3',
    owner,
    manageable: owner === INTERMEDIARY,
    collateral: [{ symbol: 'WETH', amount: 1, usd: 3000 }],
    debt: [{ symbol: 'USDC', amount: 1500, usd: 1500 }],
    collateralUsd: 3000,
    debtUsd: 1500,
    ltv: 0.5,
    liquidationLtv: 0.83,
    health: 1.66,
    liquidationPrice: { symbol: 'WETH', usd: 1807.23 },
    borrowApr: 0.0485,
    interestPerYearUsd: 72.75,
    status: 'active',
    ...overrides,
  };
};

export type FakePositionsReader = PositionsReader & {
  readOwnerPositions: ReturnType<
    typeof vi.fn<PositionsReader['readOwnerPositions']>
  >;
  readMarketPosition: ReturnType<
    typeof vi.fn<PositionsReader['readMarketPosition']>
  >;
  readMarketRisk: ReturnType<typeof vi.fn<PositionsReader['readMarketRisk']>>;
};

/**
 * A reader that finds no loans, unless a test says otherwise; every method is
 * a mock, so a test can count or replace the calls.
 */
export const createFakePositionsReader = ({
  readOwnerPositions = async () => [],
  readMarketPosition = async () => null,
  readMarketRisk = async (): Promise<PositionMarketRisk> => ({
    liquidationLtv: 0.83,
    borrowApr: 0.0485,
  }),
}: Partial<PositionsReader> = {}): FakePositionsReader => ({
  readOwnerPositions: vi.fn(readOwnerPositions),
  readMarketPosition: vi.fn(readMarketPosition),
  readMarketRisk: vi.fn(readMarketRisk),
});
