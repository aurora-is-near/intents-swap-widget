import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withMarketRisk } from '../../model/marketRisk';
import { createVaultsFyiReader } from '../createVaultsFyiReader';
import { VaultsFyiReadError } from '../guards';
import { BORROW_MARKETS } from '../networks';
import baseMarket from './fixtures/baseMarket.json';
import ownerPositions from './fixtures/ownerPositions.json';
import recordedArbitrumPosition from './fixtures/recorded/aaveArbitrumPosition.json';
import recordedBaseMarket from './fixtures/recorded/aaveBaseMarket.json';
import recordedBasePosition from './fixtures/recorded/aaveBasePosition.json';
import recordedOwnerPositions from './fixtures/recorded/ownerPositions.json';
import repaidMarketPosition from './fixtures/repaidMarketPosition.json';

const OWNER = '0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611';
const BASE_POOL = '0xa238dd80c259a72e81d7e4664a9801593f98d1c5';
const BASE = {
  network: 'base',
  marketId: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
};

const fetchStub = vi.fn<typeof fetch>();

const answer = (body: unknown, status = 200) =>
  fetchStub.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );

const reader = createVaultsFyiReader();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchStub);
});

afterEach(() => {
  fetchStub.mockReset();
  vi.unstubAllGlobals();
});

describe('readOwnerPositions', () => {
  it('reads the wallet-wide list through the proxy', async () => {
    answer(ownerPositions);

    await reader.readOwnerPositions(OWNER);

    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `/api/vaults-fyi/beta/borrow/portfolio/positions/${OWNER}`,
    );
  });

  it('maps one loan per market, largest reserve first', async () => {
    answer(ownerPositions);

    const [base, arbitrum, morpho] = await reader.readOwnerPositions(OWNER);

    expect(base).toMatchObject({
      id: `base:${BASE_POOL}:${OWNER.toLowerCase()}`,
      provider: 'aave-collateral vault-v3',
      providerName: 'Aave',
      chainLabel: 'Base',
      marketName: 'Aave V3',
      owner: OWNER.toLowerCase(),
      manageable: true,
      collateral: [{ symbol: 'WETH', amount: 1, usd: 3000 }],
      debt: [{ symbol: 'USDC', amount: 1200, usd: 1200 }],
      collateralUsd: 3000,
      debtUsd: 1200,
      ltv: 0.4,
      health: 2.075,
      liquidationLtv: null,
      borrowApr: null,
      status: 'active',
    });
    expect(arbitrum).toMatchObject({
      chainLabel: 'Arbitrum',
      manageable: true,
      collateral: [{ symbol: 'WBTC' }, { symbol: 'WETH' }],
      debt: [{ symbol: 'USDC' }, { symbol: 'USDT' }],
      collateralUsd: 4000,
      debtUsd: 3000,
      health: 1.08,
      status: 'at-risk',
      // Two collateral reserves: no single liquidation price.
      liquidationPrice: null,
    });
    expect(morpho).toMatchObject({
      providerName: 'Morpho',
      chainLabel: 'Ethereum',
      manageable: false,
      ltv: null,
      health: null,
    });
  });

  it('keeps every reserve of each market, with its positionId', async () => {
    answer(ownerPositions);

    const [base, , morpho] = await reader.readOwnerPositions(OWNER);

    // `base-weth` is also listed in the Morpho market; both loans keep it,
    // and the totals count it once by its id.
    expect(base?.collateral[0]?.id).toBe('base-weth');
    expect(morpho?.debt.map(({ id }) => id)).toEqual(['eth-usdc', 'base-weth']);
  });

  it('keeps an unpriced reserve with a null value', async () => {
    answer(ownerPositions);

    const [, , morpho] = await reader.readOwnerPositions(OWNER);

    expect(morpho?.collateral).toEqual([
      expect.objectContaining({ symbol: 'wstETH', amount: 2, usd: null }),
    ]);
  });

  it('throws on a changed response rather than listing nothing', async () => {
    answer({ positions: [] });

    await expect(reader.readOwnerPositions(OWNER)).rejects.toBeInstanceOf(
      VaultsFyiReadError,
    );
  });

  it('throws on a mistyped amount', async () => {
    const [first] = ownerPositions.data;

    answer({
      data: [
        {
          ...first,
          assets: [{ ...first?.assets[0], suppliedNative: 1 }],
        },
      ],
    });

    await expect(reader.readOwnerPositions(OWNER)).rejects.toThrow(
      'vaults.fyi answered an unexpected supplied amount',
    );
  });

  it.each([1.5, -1, 256])(
    'throws on asset decimals of %s',
    async (decimals) => {
      const [first] = ownerPositions.data;

      answer({
        data: [
          {
            ...first,
            assets: [
              {
                ...first?.assets[0],
                asset: { ...first?.assets[0]?.asset, decimals },
              },
            ],
          },
        ],
      });

      await expect(reader.readOwnerPositions(OWNER)).rejects.toThrow(
        'vaults.fyi answered an unexpected asset decimals',
      );
    },
  );

  it('throws the API error with its status', async () => {
    answer({ error: 'Forbidden', message: 'out of credits' }, 403);

    await expect(reader.readOwnerPositions(OWNER)).rejects.toMatchObject({
      name: 'VaultsFyiReadError',
      status: 403,
      message: 'out of credits',
    });
  });

  it('throws when the proxy cannot be reached', async () => {
    fetchStub.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(reader.readOwnerPositions(OWNER)).rejects.toThrow(
      'vaults.fyi could not be reached',
    );
  });
});

describe('readMarketPosition', () => {
  it('reads a repaid loan with the same id as the wallet-wide list', async () => {
    answer(repaidMarketPosition);

    const loan = await reader.readMarketPosition(OWNER, BASE);

    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `/api/vaults-fyi/beta/borrow/portfolio/positions/${OWNER}/base/${BASE.marketId}`,
    );
    expect(loan).toMatchObject({
      id: `base:${BASE_POOL}:${OWNER.toLowerCase()}`,
      status: 'repaid',
      debt: [],
      debtUsd: 0,
      ltv: 0,
      health: null,
      collateral: [{ symbol: 'WETH', amount: 0.25, usd: 750 }],
    });
  });

  it('is null for a market the owner holds nothing in', async () => {
    answer({ ...repaidMarketPosition, assets: [] });

    expect(await reader.readMarketPosition(OWNER, BASE)).toBeNull();
  });
});

describe('readMarketRisk', () => {
  it('reads thresholds and borrow rates by asset address', async () => {
    answer(baseMarket);

    const risk = await reader.readMarketRisk(BASE);

    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `/api/vaults-fyi/beta/borrow/markets/base/${BASE.marketId}`,
    );
    expect(risk.assets['0x4200000000000000000000000000000000000006']).toEqual({
      liquidationThreshold: 0.83,
      borrowApr: 0.027,
    });
  });

  it('fills the loan figures a position read lacks', async () => {
    answer(ownerPositions);
    answer(baseMarket);

    const [base] = await reader.readOwnerPositions(OWNER);
    const risk = await reader.readMarketRisk(BASE);

    expect(base && withMarketRisk(base, risk)).toMatchObject({
      liquidationLtv: 0.83,
      borrowApr: 0.0485,
      interestPerYearUsd: 1200 * 0.0485,
      liquidationPrice: { symbol: 'WETH', usd: 1200 / 0.83 },
    });
  });
});

describe('repaidMarkets', () => {
  it("lists Borrow's Aave V3 markets as vaults.fyi names them", () => {
    expect(reader.repaidMarkets()).toBe(BORROW_MARKETS);
    expect(BORROW_MARKETS).toEqual([
      BASE,
      {
        network: 'arbitrum',
        marketId: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      },
    ]);
  });
});

describe('recorded responses', () => {
  it('reads an account with no debt as no loans', async () => {
    answer(recordedOwnerPositions);

    expect(await reader.readOwnerPositions(OWNER)).toEqual([]);
  });

  it("reads Aave V3 Base's supply-only position as collateral without debt", async () => {
    answer(recordedBasePosition);

    expect(await reader.readMarketPosition(OWNER, BASE)).toMatchObject({
      id: `base:${BASE_POOL}:${OWNER.toLowerCase()}`,
      providerName: 'Aave',
      marketName: 'Aave V3',
      chainLabel: 'Base',
      manageable: true,
      collateral: [{ symbol: 'USDC', amount: 3.513477 }],
      debt: [],
      health: null,
      status: 'repaid',
    });
  });

  it('reads a market the account holds nothing in as no loan', async () => {
    answer(recordedArbitrumPosition);

    expect(
      await reader.readMarketPosition(OWNER, {
        network: 'arbitrum',
        marketId: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
      }),
    ).toBeNull();
  });

  it("reads Aave V3 Base's thresholds and rates as fractions", async () => {
    answer(recordedBaseMarket);

    const { assets } = await reader.readMarketRisk(BASE);

    expect(assets['0x4200000000000000000000000000000000000006']).toEqual({
      liquidationThreshold: 0.83,
      borrowApr: expect.closeTo(0.0199, 4),
    });
    expect(
      assets['0x833589fcd6edb6e08f4c7c32d4f71b54bda02913']
        ?.liquidationThreshold,
    ).toBe(0.78);
  });
});
