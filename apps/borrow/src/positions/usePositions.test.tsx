import type { Intermediary } from '@aurora-is-near/intents-connect';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { intentsConnectApi } from '../config';
import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import type { LendingMarket } from '../markets/types';
import {
  createFakeAdapter,
  createFakeSparkAdapter,
  createTestQueryClient,
} from '../tests/fakeMarkets';
import {
  AAVE_ARB,
  AAVE_BASE,
  createFakePositionsReader,
  EVM_WALLET,
  type FakePositionsReader,
  INTERMEDIARY,
  loanPosition,
} from '../tests/fakePositions';
import { PositionsReaderProvider } from './PositionsReaderProvider';
import { refreshPositionsAfterBorrow } from './refreshPositions';
import { usePositions } from './usePositions';

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  wallet: {},
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', () => ({
  useIntentsConnectWallet: () => wallet,
}));

/** Aave V3 on Ethereum: listed, but not one of Borrow's markets. */
const AAVE_ETH: LendingMarket = {
  ...AAVE_BASE,
  id: 'aave-v3:eth',
  chain: 'eth',
  chainId: 1,
  chainLabel: 'Ethereum',
};

const INTERMEDIARY_LOAN = loanPosition();
const WALLET_LOAN = loanPosition({
  owner: EVM_WALLET,
  network: 'arbitrum',
  marketId: 'aave-v3-arbitrum',
  chainLabel: 'Arbitrum',
  collateralUsd: 2000,
  debtUsd: 500,
});

const REPAID_LOAN = loanPosition({
  network: 'arbitrum',
  marketId: 'aave-v3-arbitrum',
  chainLabel: 'Arbitrum',
  debt: [],
  debtUsd: 0,
  health: null,
  status: 'repaid',
});

/** Each owner's wallet-wide list. */
const ownerPositions = async (owner: string) =>
  owner === INTERMEDIARY ? [INTERMEDIARY_LOAN] : [WALLET_LOAN];

/** The intermediary's loan in each Borrow market: active on Base, repaid on Arbitrum. */
const marketPosition = async (_owner: string, market: LendingMarket) =>
  market.id === AAVE_BASE.id ? INTERMEDIARY_LOAN : REPAID_LOAN;

const render = (reader: FakePositionsReader) => {
  const queryClient = createTestQueryClient();
  const adapters = [
    createFakeAdapter({
      id: 'aave-v3',
      listMarkets: async () => [AAVE_BASE, AAVE_ARB, AAVE_ETH],
    }),
    createFakeSparkAdapter(),
  ];

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MarketAdaptersProvider adapters={adapters}>
        <PositionsReaderProvider reader={reader}>
          {children}
        </PositionsReaderProvider>
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => usePositions(), { wrapper }),
  };
};

describe('usePositions', () => {
  beforeEach(() => {
    wallet.address = EVM_WALLET;
    vi.spyOn(intentsConnectApi, 'getIntermediary').mockResolvedValue({
      originAccount: EVM_WALLET,
      originType: 'evm',
      evm: INTERMEDIARY,
      solana: null,
    } satisfies Intermediary);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('merges the intermediary’s and the wallet’s loans, deduplicated by id', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: ownerPositions,
      readMarketPosition: marketPosition,
    });

    const { result } = render(reader);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The Base loan is in the wallet-wide list and its market read: once.
    expect(result.current.positions).toEqual([
      INTERMEDIARY_LOAN,
      WALLET_LOAN,
      REPAID_LOAN,
    ]);
    expect(result.current.count).toBe(3);
    expect(result.current.totals).toEqual({
      collateralUsd: 3000 + 2000 + 3000,
      debtUsd: 1500 + 500,
    });
    expect(result.current.errors).toEqual([]);
    // The wallet is read while the intermediary is looked up.
    expect(reader.readOwnerPositions.mock.calls).toHaveLength(2);
    expect(reader.readOwnerPositions.mock.calls).toEqual(
      expect.arrayContaining([[INTERMEDIARY], [EVM_WALLET]]),
    );
  });

  it('looks for repaid loans only under the intermediary, on Aave V3 Base and Arbitrum', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: ownerPositions,
      readMarketPosition: marketPosition,
    });

    const { result } = render(reader);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(reader.readMarketPosition.mock.calls).toEqual([
      [INTERMEDIARY, AAVE_BASE],
      [INTERMEDIARY, AAVE_ARB],
    ]);
  });

  it('reads positions under `positions` every 60 s and on window focus', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: ownerPositions,
      readMarketPosition: marketPosition,
    });

    const { result, queryClient } = render(reader);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const queries = queryClient.getQueryCache().findAll({
      queryKey: ['positions'],
    });

    expect(queries).toHaveLength(4);
    expect(queries.map(({ queryKey }) => queryKey)).toEqual(
      expect.arrayContaining([
        ['positions', 'owner', INTERMEDIARY],
        ['positions', 'owner', EVM_WALLET],
        ['positions', 'market', INTERMEDIARY, AAVE_BASE.id],
        ['positions', 'market', INTERMEDIARY, AAVE_ARB.id],
      ]),
    );

    queries.forEach(({ options }) =>
      expect(options).toMatchObject({
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
      }),
    );
  });

  it('keeps what loaded and reports the read that failed', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: async (owner) => {
        if (owner === EVM_WALLET) {
          throw new Error('wallet read failed');
        }

        return [INTERMEDIARY_LOAN];
      },
    });

    const { result } = render(reader);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.positions).toEqual([INTERMEDIARY_LOAN]);
    expect(result.current.errors).toEqual([
      {
        read: 'owner-positions',
        owner: EVM_WALLET,
        error: new Error('wallet read failed'),
      },
    ]);
  });

  it('keeps the loaded positions when a refetch fails, and retries on refetch()', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: ownerPositions,
    });

    const { result } = render(reader);

    await waitFor(() => expect(result.current.count).toBe(2));

    reader.readOwnerPositions.mockRejectedValue(new Error('down'));
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.errors).toHaveLength(2));

    expect(result.current.positions).toEqual([INTERMEDIARY_LOAN, WALLET_LOAN]);
    expect(result.current.count).toBe(2);

    reader.readOwnerPositions.mockImplementation(ownerPositions);
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.errors).toEqual([]));
  });

  it('takes missing risk figures from the market’s data', async () => {
    const bare = loanPosition({ liquidationLtv: null, borrowApr: null });
    const reader = createFakePositionsReader({
      readOwnerPositions: async (owner) =>
        owner === INTERMEDIARY ? [bare] : [],
      readMarketRisk: async () => ({ liquidationLtv: 0.8, borrowApr: 0.05 }),
    });

    const { result, queryClient } = render(reader);

    await waitFor(() =>
      expect(result.current.positions[0]).toMatchObject({
        liquidationLtv: 0.8,
        borrowApr: 0.05,
      }),
    );

    expect(reader.readMarketRisk).toHaveBeenCalledWith({
      network: 'base',
      marketId: 'aave-v3-base',
    });
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['position-market-risk', 'base', 'aave-v3-base'],
      })?.options,
    ).toMatchObject({ staleTime: 60 * 60_000 });
  });

  it('reads every position again when a borrow is done, then at ~10 s and ~30 s', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: ownerPositions,
    });

    const { result, queryClient } = render(reader);

    await waitFor(() => expect(result.current.count).toBe(2));

    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    reader.readOwnerPositions.mockClear();
    refreshPositionsAfterBorrow(queryClient);

    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: ['positions'] });
    expect(invalidate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);

    expect(invalidate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(20_000);

    expect(invalidate).toHaveBeenCalledTimes(3);

    vi.useRealTimers();

    await waitFor(() =>
      expect(reader.readOwnerPositions.mock.calls.length).toBeGreaterThan(0),
    );

    // The market data is not read again.
    expect(
      invalidate.mock.calls.every(
        ([filters]) => (filters?.queryKey ?? [])[0] === 'positions',
      ),
    ).toBe(true);
  });

  it('reads nothing without a reader', () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MarketAdaptersProvider adapters={[]}>
          {children}
        </MarketAdaptersProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => usePositions(), { wrapper });

    expect(result.current).toMatchObject({
      positions: [],
      count: 0,
      isLoading: false,
      errors: [],
    });
    expect(intentsConnectApi.getIntermediary).not.toHaveBeenCalled();
  });
});
