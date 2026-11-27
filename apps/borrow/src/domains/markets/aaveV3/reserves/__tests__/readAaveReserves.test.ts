import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Address, PublicClient } from 'viem';

import { readAaveReserves } from '..';
import { AAVE_V3_MARKETS } from '../../config/registry';
import type { AaveReadClient } from '..';

const [market] = AAVE_V3_MARKETS;

if (!market) {
  throw new Error('No Aave market in the registry');
}

const HEAD = 1_000n;
const PINNED = HEAD - 1n;
const RAY = 10n ** 27n;

type Fixture = {
  symbol: string;
  tokenAddress: Address;
  decimals: bigint;
  ltv: bigint;
  liquidationThreshold: bigint;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  paused: boolean;
  borrowCap: bigint;
  supplyCap: bigint;
  totalAToken: bigint;
  variableBorrowRate: bigint;
  totalDebt: bigint;
  virtualBalance: bigint;
  debtCeiling: bigint;
  price: bigint;
};

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';

const reserve = (overrides: Partial<Fixture> = {}): Fixture => ({
  symbol: 'USDC',
  tokenAddress: USDC,
  decimals: 6n,
  ltv: 7500n,
  liquidationThreshold: 7800n,
  usageAsCollateralEnabled: true,
  borrowingEnabled: true,
  isActive: true,
  isFrozen: false,
  paused: false,
  borrowCap: 0n,
  supplyCap: 0n,
  totalAToken: 1_000_000n,
  variableBorrowRate: 0n,
  totalDebt: 0n,
  virtualBalance: 5_000_000n,
  debtCeiling: 0n,
  price: 100_000_000n,
  ...overrides,
});

const reads = (fixture: Fixture): Record<string, unknown> => ({
  getReserveConfigurationData: [
    fixture.decimals,
    fixture.ltv,
    fixture.liquidationThreshold,
    10500n,
    1000n,
    fixture.usageAsCollateralEnabled,
    fixture.borrowingEnabled,
    false,
    fixture.isActive,
    fixture.isFrozen,
  ],
  getPaused: fixture.paused,
  getReserveCaps: [fixture.borrowCap, fixture.supplyCap],
  getReserveData: [
    0n,
    0n,
    fixture.totalAToken,
    0n,
    fixture.totalDebt,
    0n,
    fixture.variableBorrowRate,
    0n,
    0n,
    RAY,
    RAY,
    1_700_000_000,
  ],
  getTotalDebt: fixture.totalDebt,
  getVirtualUnderlyingBalance: fixture.virtualBalance,
  getDebtCeiling: fixture.debtCeiling,
});

type Call = {
  address: Address;
  functionName: string;
  args?: readonly unknown[];
};

/**
 * A client whose multicall answers each contract call from the fixtures.
 * `edit` changes the answers before they are returned.
 */
const mockClient = (
  fixtures: Fixture[],
  edit: (results: unknown[]) => unknown[] = (results) => results,
) => {
  const byAddress = new Map(
    fixtures.map((fixture) => [fixture.tokenAddress.toLowerCase(), fixture]),
  );

  const answer = ({ functionName, args = [] }: Call): unknown => {
    if (functionName === 'BASE_CURRENCY_UNIT') {
      return 100_000_000n;
    }

    if (functionName === 'getAssetsPrices') {
      const [assets] = args as [Address[]];

      return assets.map(
        (asset) => byAddress.get(asset.toLowerCase())?.price ?? null,
      );
    }

    const [asset] = args as [Address];
    const fixture = byAddress.get(asset.toLowerCase());

    if (!fixture) {
      throw new Error(`Unexpected read of ${asset}`);
    }

    return reads(fixture)[functionName];
  };

  return {
    getBlockNumber: vi.fn().mockResolvedValue(HEAD),
    readContract: vi
      .fn()
      .mockResolvedValue(
        fixtures.map(({ symbol, tokenAddress }) => ({ symbol, tokenAddress })),
      ),
    multicall: vi.fn(
      async ({
        contracts,
      }: {
        blockNumber: bigint;
        allowFailure: false;
        contracts: readonly Call[];
      }) => edit(contracts.map(answer)),
    ),
  };
};

const read = (fixtures: Fixture[], assets?: Address[]) =>
  readAaveReserves(mockClient(fixtures), market, { assets });

describe('readAaveReserves', () => {
  it('takes a viem public client', () => {
    expectTypeOf<PublicClient>().toExtend<AaveReadClient>();
  });

  it('pins every read to the block behind the head', async () => {
    const client = mockClient([reserve()]);

    await readAaveReserves(client, market);

    expect(client.readContract).toHaveBeenCalledTimes(1);
    expect(client.multicall).toHaveBeenCalledTimes(1);

    const calls = [
      ...client.readContract.mock.calls,
      ...client.multicall.mock.calls,
    ];

    expect(calls.map(([parameters]) => parameters.blockNumber)).toEqual([
      PINNED,
      PINNED,
    ]);
    expect(
      client.multicall.mock.calls.map(
        ([parameters]) => parameters.allowFailure,
      ),
    ).toEqual([false]);
  });

  it('reads the oracle prices and base unit in the reserve multicall', async () => {
    const client = mockClient([reserve()]);
    const result = await readAaveReserves(client, market);

    const contracts = client.multicall.mock.calls[0]?.[0].contracts ?? [];
    const oracleCalls = contracts.filter(
      ({ address }) => address === market.oracle,
    );

    expect(oracleCalls.map(({ functionName }) => functionName)).toEqual([
      'BASE_CURRENCY_UNIT',
      'getAssetsPrices',
    ]);
    expect(result.baseCurrencyUnit).toBe(100_000_000n);
    expect(result.collateral[0]?.priceBase).toBe(100_000_000n);
    expect(result.borrowable[0]?.priceBase).toBe(100_000_000n);
  });

  it('rejects when the multicall rejects', async () => {
    const client = mockClient([reserve()]);

    client.multicall.mockRejectedValueOnce(new Error('execution reverted'));

    await expect(readAaveReserves(client, market)).rejects.toThrow(
      'execution reverted',
    );
  });

  it('maps a reserve into collateral and borrowable', async () => {
    const result = await read([
      reserve({ variableBorrowRate: (RAY * 485n) / 10_000n }),
    ]);

    expect(result.collateral).toEqual([
      {
        asset: USDC,
        symbol: 'USDC',
        decimals: 6,
        priceBase: 100_000_000n,
        maxLtvBps: 7500,
        liquidationLtvBps: 7800,
      },
    ]);
    expect(result.borrowable).toEqual([
      {
        asset: USDC,
        symbol: 'USDC',
        decimals: 6,
        priceBase: 100_000_000n,
        variableBorrowApr: 0.0485,
        availableLiquidity: 5_000_000n,
      },
    ]);
  });

  it('reads only the requested assets, in any address case', async () => {
    const client = mockClient([
      reserve(),
      reserve({ symbol: 'wstETH', tokenAddress: WSTETH, decimals: 18n }),
    ]);

    const result = await readAaveReserves(client, market, {
      assets: [WSTETH.toLowerCase() as Address],
    });

    expect(result.collateral.map(({ symbol }) => symbol)).toEqual(['wstETH']);
    expect(client.multicall.mock.calls[0]?.[0].contracts).toHaveLength(2 + 7);
  });

  it('reads the head and the reserve list while a promised filter resolves', async () => {
    const client = mockClient([
      reserve(),
      reserve({ symbol: 'wstETH', tokenAddress: WSTETH, decimals: 18n }),
    ]);

    let resolveAssets: (assets: Address[]) => void = () => {};
    const assets = new Promise<Address[]>((resolve) => {
      resolveAssets = resolve;
    });

    const reading = readAaveReserves(client, market, { assets });

    await vi.waitFor(() => expect(client.readContract).toHaveBeenCalled());

    expect(client.multicall).not.toHaveBeenCalled();

    resolveAssets([WSTETH]);

    const result = await reading;

    expect(result.collateral.map(({ symbol }) => symbol)).toEqual(['wstETH']);
  });

  describe('filters', () => {
    it.each([
      ['frozen', { isFrozen: true }],
      ['paused', { paused: true }],
      ['inactive', { isActive: false }],
    ])('drops a %s reserve from both lists', async (_, overrides) => {
      const result = await read([reserve(overrides)]);

      expect(result.collateral).toEqual([]);
      expect(result.borrowable).toEqual([]);
    });

    it.each([
      ['not usable as collateral', { usageAsCollateralEnabled: false }],
      ['with ltv 0', { ltv: 0n }],
      ['with a debt ceiling (isolation mode)', { debtCeiling: 1_000_000n }],
    ])('drops a reserve %s from collateral only', async (_, overrides) => {
      const result = await read([reserve(overrides)]);

      expect(result.collateral).toEqual([]);
      expect(result.borrowable).toHaveLength(1);
    });

    it('drops a reserve with borrowing disabled from borrowable only', async () => {
      const result = await read([reserve({ borrowingEnabled: false })]);

      expect(result.collateral).toHaveLength(1);
      expect(result.borrowable).toEqual([]);
    });

    it('marks collateral unavailable once its supply cap is reached', async () => {
      const capped = await read([
        reserve({ supplyCap: 1n, totalAToken: 1_000_000n }),
      ]);

      const below = await read([
        reserve({ supplyCap: 2n, totalAToken: 1_000_000n }),
      ]);

      expect(capped.collateral[0]?.unavailable).toBe(true);
      expect(capped.collateral[0]?.unavailableReason).toBe('cap-reached');
      expect(below.collateral[0]?.unavailable).toBeUndefined();
      expect(below.collateral[0]?.unavailableReason).toBeUndefined();
    });
  });

  describe('availableLiquidity', () => {
    it('is the virtual balance with no borrow cap', async () => {
      const result = await read([
        reserve({ borrowCap: 0n, totalDebt: 9_000_000n, virtualBalance: 5n }),
      ]);

      expect(result.borrowable[0]?.availableLiquidity).toBe(5n);
    });

    it('is the room under the cap, scaled by decimals, when it is lower', async () => {
      const result = await read([
        reserve({
          borrowCap: 3n,
          totalDebt: 1_000_000n,
          virtualBalance: 5_000_000n,
        }),
      ]);

      expect(result.borrowable[0]?.availableLiquidity).toBe(2_000_000n);
    });

    it('is the virtual balance when the cap leaves more room', async () => {
      const result = await read([
        reserve({ borrowCap: 100n, totalDebt: 0n, virtualBalance: 5_000_000n }),
      ]);

      expect(result.borrowable[0]?.availableLiquidity).toBe(5_000_000n);
      expect(result.borrowable[0]?.unavailable).toBeUndefined();
      expect(result.borrowable[0]?.unavailableReason).toBeUndefined();
    });

    it('floors at 0 when debt is above the cap', async () => {
      const result = await read([
        reserve({ borrowCap: 1n, totalDebt: 2_000_000n }),
      ]);

      expect(result.borrowable[0]?.availableLiquidity).toBe(0n);
      expect(result.borrowable[0]?.unavailable).toBe(true);
      expect(result.borrowable[0]?.unavailableReason).toBe('cap-reached');
    });
  });

  it('converts the variable borrow rate from ray to a plain fraction', async () => {
    const result = await read([reserve({ variableBorrowRate: RAY / 8n })]);

    expect(result.borrowable[0]?.variableBorrowApr).toBe(0.125);
  });

  describe('missing values', () => {
    const name = `USDC (${USDC})`;

    const readEdited = (edit: (results: unknown[]) => unknown[]) =>
      readAaveReserves(mockClient([reserve()], edit), market);

    /** The per-reserve result at `offset` (0 = configuration data). */
    const at = (offset: number) => 2 + offset;

    it('throws on a missing tuple, naming the reserve', async () => {
      await expect(
        readEdited((results) => results.slice(0, at(3))),
      ).rejects.toThrow(`missing getReserveData for reserve ${name}`);
    });

    it.each([
      [2, 'totalAToken'],
      [6, 'variableBorrowRate'],
    ])(
      'throws on a missing reserve data field %i (%s)',
      async (index, field) => {
        await expect(
          readEdited((results) => {
            const data = [...(results[at(3)] as unknown[])];

            data[index] = undefined;

            return results.with(at(3), data);
          }),
        ).rejects.toThrow(`missing ${field} for reserve ${name}`);
      },
    );

    it.each([
      [0, 'getReserveConfigurationData'],
      [1, 'getPaused'],
      [2, 'getReserveCaps'],
      [4, 'getTotalDebt'],
      [5, 'getVirtualUnderlyingBalance'],
      [6, 'getDebtCeiling'],
    ])('throws when read %i (%s) is missing', async (offset, field) => {
      await expect(
        readEdited((results) => results.with(at(offset), undefined)),
      ).rejects.toThrow(`missing ${field} for reserve ${name}`);
    });

    it('throws on a short configuration tuple', async () => {
      await expect(
        readEdited((results) =>
          results.with(at(0), (results[at(0)] as unknown[]).slice(0, 9)),
        ),
      ).rejects.toThrow(`missing isFrozen for reserve ${name}`);
    });

    it('throws on a missing price', async () => {
      await expect(
        readEdited((results) => results.with(1, [])),
      ).rejects.toThrow(`missing oracle price for reserve ${name}`);
    });

    it('throws on a zero price instead of reading it as $0', async () => {
      await expect(read([reserve({ price: 0n })])).rejects.toThrow(
        `missing oracle price for reserve ${name}`,
      );
    });

    it('ignores a zero price on a reserve it drops anyway', async () => {
      const result = await read([reserve({ price: 0n, isFrozen: true })]);

      expect(result.collateral).toEqual([]);
      expect(result.borrowable).toEqual([]);
    });

    it('throws on a missing base currency unit', async () => {
      await expect(
        readEdited((results) => results.with(0, undefined)),
      ).rejects.toThrow('missing oracle BASE_CURRENCY_UNIT');
    });

    it('throws on a malformed reserve list entry', async () => {
      const client = mockClient([reserve()]);

      client.readContract.mockResolvedValueOnce([{ symbol: 'USDC' }]);

      await expect(readAaveReserves(client, market)).rejects.toThrow(
        'missing reserve token #0',
      );
    });
  });
});
