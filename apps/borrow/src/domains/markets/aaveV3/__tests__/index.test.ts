import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportedToken } from '@aurora-is-near/intents-connect';

import { createAaveV3Adapter } from '..';
import type { LendingMarket } from '../../types';
import type { AaveReadClient, AaveReserves } from '../reserves';

const readAaveReserves = vi.hoisted(() => vi.fn());

vi.mock('../reserves', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../reserves')>()),
  readAaveReserves,
}));

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';

const usdcToken: SupportedToken = {
  blockchain: 'base',
  contractAddress: USDC.toLowerCase(),
  assetId: 'nep141:base-usdc.omft.near',
  symbol: 'USDC',
  decimals: 6,
};

const read: AaveReserves = {
  baseCurrencyUnit: 100_000_000n,
  collateral: [
    {
      asset: USDC,
      symbol: 'USDC',
      decimals: 6,
      maxLtvBps: 7500,
      liquidationLtvBps: 7800,
      priceBase: 100_000_000n,
    },
    // Read but not delivered by 1Click: dropped.
    {
      asset: WSTETH,
      symbol: 'wstETH',
      decimals: 18,
      maxLtvBps: 7100,
      liquidationLtvBps: 7600,
      priceBase: 400_000_000_000n,
    },
  ],
  borrowable: [
    {
      asset: USDC,
      symbol: 'USDC',
      decimals: 6,
      variableBorrowApr: 0.05,
      availableLiquidity: 1_000_000n,
      priceBase: 100_000_000n,
    },
  ],
};

const client: AaveReadClient = {
  getBlockNumber: vi.fn(),
  readContract: vi.fn(),
  multicall: vi.fn(),
};

const setup = (
  listSupportedTokens = vi.fn().mockResolvedValue({ out: [usdcToken] }),
) => {
  const getClient = vi.fn(() => client);
  const adapter = createAaveV3Adapter({
    api: { listSupportedTokens },
    getClient,
    actionsApi: { resolveAction: vi.fn() },
  });

  return { adapter, getClient, listSupportedTokens };
};

const marketOn = async (chain: string): Promise<LendingMarket> => {
  const markets = await setup().adapter.listMarkets();
  const market = markets.find((entry) => entry.chain === chain);

  if (!market) {
    throw new Error(`No market on ${chain}`);
  }

  return market;
};

beforeEach(() => {
  readAaveReserves.mockReset();
  readAaveReserves.mockResolvedValue(read);
});

describe('createAaveV3Adapter', () => {
  it('lists Aave on every registry chain', async () => {
    const { adapter } = setup();

    expect(adapter.id).toBe('aave-v3');
    await expect(adapter.listMarkets()).resolves.toEqual([
      {
        id: 'aave-v3:base',
        provider: 'aave-v3',
        name: 'Aave',
        chain: 'base',
        chainId: 8453,
        chainLabel: 'Base',
      },
      {
        id: 'aave-v3:arb',
        provider: 'aave-v3',
        name: 'Aave',
        chain: 'arb',
        chainId: 42161,
        chainLabel: 'Arbitrum',
      },
      {
        id: 'aave-v3:pol',
        provider: 'aave-v3',
        name: 'Aave',
        chain: 'pol',
        chainId: 137,
        chainLabel: 'Polygon',
      },
    ]);
  });

  it('reads only the delivered reserves and carries their asset ids', async () => {
    const market = await marketOn('base');
    const { adapter, getClient, listSupportedTokens } = setup();

    const snapshot = await adapter.getMarketSnapshot(market);

    expect(listSupportedTokens).toHaveBeenCalledWith('inOperation');
    expect(getClient).toHaveBeenCalledWith(8453);
    expect(readAaveReserves).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ chain: 'base' }),
      { assets: expect.any(Promise) },
    );
    await expect(readAaveReserves.mock.calls[0]?.[2]?.assets).resolves.toEqual([
      USDC.toLowerCase(),
    ]);

    expect(snapshot).toEqual({
      market,
      baseCurrencyUnit: 100_000_000n,
      // USDC is not collateral in the borrow action's tables: still listed,
      // marked coming soon.
      collateral: [
        {
          ...read.collateral[0],
          assetId: usdcToken.assetId,
          unavailable: true,
          unavailableReason: 'coming-soon',
        },
      ],
      borrowable: [{ ...read.borrowable[0], assetId: usdcToken.assetId }],
    });
  });

  it('rejects with the token list failure, read alongside the reserves', async () => {
    const market = await marketOn('base');
    const { adapter } = setup(
      vi.fn().mockRejectedValue(new Error('Intents Connect API responded 502')),
    );

    await expect(adapter.getMarketSnapshot(market)).rejects.toThrow(
      'responded 502',
    );
    // Both reads start at once: the token list only filters the reserves.
    expect(readAaveReserves).toHaveBeenCalledTimes(1);
  });

  it('rejects when the reserve read fails', async () => {
    const market = await marketOn('arb');
    const { adapter } = setup();

    readAaveReserves.mockRejectedValue(new Error('execution reverted'));

    await expect(adapter.getMarketSnapshot(market)).rejects.toThrow(
      'execution reverted',
    );
  });

  it('rejects an unknown market', async () => {
    const { adapter } = setup();
    const market = await marketOn('base');

    await expect(
      adapter.getMarketSnapshot({ ...market, id: 'aave-v3:eth' }),
    ).rejects.toThrow('unknown market aave-v3:eth');
  });

  it('shares one token list request between concurrent snapshots', async () => {
    const [base, arb] = await Promise.all([marketOn('base'), marketOn('arb')]);
    const { adapter, listSupportedTokens } = setup();

    await Promise.all([
      adapter.getMarketSnapshot(base),
      adapter.getMarketSnapshot(arb),
    ]);

    expect(listSupportedTokens).toHaveBeenCalledTimes(1);
    expect(readAaveReserves).toHaveBeenCalledTimes(2);

    // Settled requests are not reused: a later snapshot asks again.
    await adapter.getMarketSnapshot(base);

    expect(listSupportedTokens).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a failed token list', async () => {
    const market = await marketOn('base');
    const { adapter, listSupportedTokens } = setup(
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Intents Connect API responded 502'))
        .mockResolvedValue({ out: [usdcToken] }),
    );

    await expect(adapter.getMarketSnapshot(market)).rejects.toThrow(
      'responded 502',
    );
    await expect(adapter.getMarketSnapshot(market)).resolves.toMatchObject({
      market,
    });
    expect(listSupportedTokens).toHaveBeenCalledTimes(2);
  });
});
