import type { LoanPosition } from './types';
import type { PositionsReadError } from './usePositions';

/*
 * Sample loans for the dev-only /gallery and component tests, shaped as the
 * positions reader returns them. Figures follow the artboards' sample loan
 * (Web-Position.dc.html): 1 WETH at $3,000 against 1,500 USDC on Aave Base.
 */

export const SAMPLE_INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
export const SAMPLE_WALLET = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

/** An active WETH / USDC loan on Aave V3 Base, Borrow-managed. */
export const samplePosition = (
  overrides: Partial<LoanPosition> = {},
): LoanPosition => {
  const owner = overrides.owner ?? SAMPLE_INTERMEDIARY;
  const provider = overrides.provider ?? 'aave-v3';
  const network = overrides.network ?? 'base';
  const marketId = overrides.marketId ?? 'aave-v3-base';

  return {
    id: `${provider}:${network}:${marketId}:${owner}`,
    provider,
    providerName: 'Aave',
    network,
    marketId,
    chainLabel: 'Base',
    marketName: 'Aave V3',
    owner,
    manageable: owner === SAMPLE_INTERMEDIARY,
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

export const ACTIVE_POSITION = samplePosition();

/** cbBTC against USDT on Arbitrum at health 1.08. */
export const AT_RISK_POSITION = samplePosition({
  network: 'arbitrum',
  marketId: 'aave-v3-arbitrum',
  chainLabel: 'Arbitrum',
  collateral: [{ symbol: 'cbBTC', amount: 0.05, usd: 4800 }],
  debt: [{ symbol: 'USDT', amount: 3700, usd: 3700 }],
  collateralUsd: 4800,
  debtUsd: 3700,
  ltv: 0.7708,
  liquidationLtv: 0.83,
  health: 1.08,
  liquidationPrice: { symbol: 'cbBTC', usd: 89_156.63 },
  borrowApr: 0.0512,
  interestPerYearUsd: 189.44,
  status: 'at-risk',
});

/** No debt left; 0.8 WETH still supplied on Arbitrum. */
export const REPAID_POSITION = samplePosition({
  network: 'arbitrum',
  marketId: 'aave-v3-arbitrum-weth',
  chainLabel: 'Arbitrum',
  collateral: [{ symbol: 'WETH', amount: 0.8, usd: 2400 }],
  debt: [],
  collateralUsd: 2400,
  debtUsd: 0,
  ltv: 0,
  health: null,
  liquidationPrice: null,
  borrowApr: null,
  interestPerYearUsd: null,
  status: 'repaid',
});

/** A Morpho loan of the connected wallet: listed, not managed by Borrow. */
export const READ_ONLY_POSITION = samplePosition({
  owner: SAMPLE_WALLET,
  provider: 'morpho',
  providerName: 'Morpho',
  marketName: 'Morpho Blue',
  marketId: 'wsteth-usdc',
  collateral: [{ symbol: 'wstETH', amount: 2, usd: 7200 }],
  debt: [{ symbol: 'USDC', amount: 3000, usd: 3000 }],
  collateralUsd: 7200,
  debtUsd: 3000,
  ltv: 0.4167,
  liquidationLtv: 0.86,
  health: 2.06,
  liquidationPrice: { symbol: 'wstETH', usd: 1744.19 },
  borrowApr: 0.061,
  interestPerYearUsd: 183,
});

/** The wallet-wide read of the connected wallet failed. */
export const OWNER_READ_ERROR: PositionsReadError = {
  read: 'owner-positions',
  owner: SAMPLE_WALLET,
  error: new Error('403'),
};
