import { beforeEach, describe, expect, it, vi } from 'vitest';

import { monadPublic } from './client';
import { USDC } from './constants';
import { fetchAavePositions } from './positions';

vi.mock('./client', () => ({
  monadPublic: {
    getBlockNumber: vi.fn(),
    readContract: vi.fn(),
    multicall: vi.fn(),
  },
}));

const OWNER = '0x0000000000000000000000000000000000000001';
const WETH = '0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242';
const userReserve = (
  supplied = 0n,
  borrowed = 0n,
  rate = 0n,
  collateral = false,
) => [supplied, 0n, borrowed, 0n, 0n, 0n, rate, 0, collateral];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(monadPublic.getBlockNumber).mockResolvedValue(100n);
  vi.mocked(monadPublic.readContract).mockResolvedValue([
    { symbol: 'USDC', tokenAddress: USDC },
    { symbol: 'WETH', tokenAddress: WETH },
  ]);
});

describe('fetchAavePositions', () => {
  it('keeps accrued balances exact, includes debt-only reserves, and compounds ray APR', async () => {
    const supplied = 9007199254740993n;

    vi.mocked(monadPublic.multicall)
      .mockResolvedValueOnce([
        userReserve(supplied, 0n, 5n * 10n ** 25n, true),
        userReserve(0n, 10n ** 18n),
      ])
      .mockResolvedValueOnce([6, 18]);

    const positions = await fetchAavePositions(OWNER);

    expect(positions[0]).toMatchObject({
      asset: USDC,
      supplied,
      borrowed: 0n,
      decimals: 6,
      isCollateral: true,
    });
    expect(positions[0]?.supplyApy).toBeCloseTo(0.0512710963, 9);
    expect(positions[1]).toMatchObject({
      asset: WETH,
      supplied: 0n,
      borrowed: 10n ** 18n,
      decimals: 18,
      isCollateral: false,
      supplyApy: 0,
    });
    expect(monadPublic.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 99n }),
    );

    vi.mocked(monadPublic.multicall).mock.calls.forEach(([call]) => {
      expect(call).toMatchObject({ blockNumber: 99n, allowFailure: false });
    });

    expect(
      vi.mocked(monadPublic.multicall).mock.calls[0]?.[0].contracts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: [USDC, OWNER] }),
        expect.objectContaining({ args: [WETH, OWNER] }),
      ]),
    );
  });

  it('filters empty reserves before reading decimals', async () => {
    vi.mocked(monadPublic.multicall)
      .mockResolvedValueOnce([userReserve(), userReserve(1n)])
      .mockResolvedValueOnce([18]);

    const positions = await fetchAavePositions(OWNER);

    expect(positions).toHaveLength(1);
    expect(positions[0]?.asset).toBe(WETH);
    expect(
      vi.mocked(monadPublic.multicall).mock.calls[1]?.[0].contracts,
    ).toEqual([expect.objectContaining({ address: WETH })]);
  });

  it('returns an empty wallet without a metadata request', async () => {
    vi.mocked(monadPublic.multicall).mockResolvedValueOnce([
      userReserve(),
      userReserve(),
    ]);

    expect(await fetchAavePositions(OWNER)).toEqual([]);
    expect(monadPublic.multicall).toHaveBeenCalledTimes(1);
  });

  it('does not hide a failed balance read as an empty wallet', async () => {
    vi.mocked(monadPublic.multicall).mockRejectedValueOnce(
      new Error('RPC unavailable'),
    );

    await expect(fetchAavePositions(OWNER)).rejects.toThrow('RPC unavailable');
  });

  it('does not guess token decimals after a metadata failure', async () => {
    vi.mocked(monadPublic.multicall)
      .mockResolvedValueOnce([userReserve(1n), userReserve()])
      .mockRejectedValueOnce(new Error('Metadata unavailable'));

    await expect(fetchAavePositions(OWNER)).rejects.toThrow(
      'Metadata unavailable',
    );
  });

  it('rejects non-EVM owners before making RPC requests', async () => {
    await expect(fetchAavePositions('solana-wallet')).rejects.toThrow();
    expect(monadPublic.getBlockNumber).not.toHaveBeenCalled();
  });
});
