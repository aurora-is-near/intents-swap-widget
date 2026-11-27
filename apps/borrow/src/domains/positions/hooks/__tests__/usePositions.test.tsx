import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { createTestQueryClient } from '@/tests/fakeMarkets';
import {
  ARB_MARKET,
  BASE_MARKET,
  createFakePositionsReader,
  EVM_WALLET,
  fakeLoan,
  fakeRepaidLoan,
  INTERMEDIARY,
} from '@/tests/fakePositions';
import type { WalletFamily } from '@/domains/wallet/types';

import { PositionsReaderProvider } from '../../providers/PositionsReaderProvider';
import { usePositions } from '../usePositions';
import { usePositionsCount } from '../usePositionsCount';
import { useRefreshPositionsOnDone } from '../useRefreshPositions';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  family: null as WalletFamily | null,
  connect: () => {},
  disconnect: () => {},
}));

const intents = vi.hoisted(() => ({
  getIntermediary: vi.fn(async (_address: string, _options?: unknown) => ({
    evm: '0x00000000000000000000000000000000000000AA',
  })),
}));

vi.mock('@/domains/wallet/hooks/useWallet', async () =>
  (await import('@/tests/walletMock')).createWalletMock(wallet),
);

vi.mock('@aurora-is-near/intents-connect/react', () => ({
  useIntentsConnect: () => ({ api: intents, wallet: null }),
}));

let reader = createFakePositionsReader();

const render = <T, P = undefined>(hook: (props: P) => T, initialProps?: P) => {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <PositionsReaderProvider reader={reader}>
        {children}
      </PositionsReaderProvider>
    </QueryClientProvider>
  );

  return { client, ...renderHook(hook, { wrapper, initialProps }) };
};

const connect = (family: WalletFamily, address: string) => {
  Object.assign(wallet, { address, isConnected: true, family });
};

beforeEach(() => {
  // A local .env may set the dev override; these tests read the wallet.
  vi.stubEnv('VITE_DEBUG_POSITIONS_OWNER', '');
  reader = createFakePositionsReader();
  Object.assign(wallet, {
    address: undefined,
    isConnected: false,
    family: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  intents.getIntermediary.mockClear();
});

describe('usePositions', () => {
  it('is idle and reads nothing without a wallet', () => {
    const { result } = render(usePositions);

    expect(result.current.status).toBe('idle');
    expect(reader.readOwnerPositions).not.toHaveBeenCalled();
  });

  it("reads the intermediary's and the EVM wallet's loans", async () => {
    connect('evm', EVM_WALLET);
    reader.readOwnerPositions.mockImplementation(async (owner) => [
      fakeLoan({ owner }),
    ]);

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(intents.getIntermediary).toHaveBeenCalledWith(EVM_WALLET, {
      publicKey: undefined,
    });
    expect(
      reader.readOwnerPositions.mock.calls.map(([owner]) => owner),
    ).toEqual([INTERMEDIARY, EVM_WALLET]);
    // Repaid loans are the intermediary's: the wallet's own supply-only
    // positions are deposits, not loans.
    expect(
      reader.readMarketPosition.mock.calls.map(([owner]) => owner),
    ).toEqual([INTERMEDIARY, INTERMEDIARY]);
    expect(
      result.current.positions.map(({ owner, manageable }) => [
        owner,
        manageable,
      ]),
    ).toEqual([
      [INTERMEDIARY, true],
      // Opened elsewhere: read-only.
      [EVM_WALLET, false],
    ]);
  });

  it('reads only the intermediary for a non-EVM wallet', async () => {
    connect('sol', 'So1anaWa11et');

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(reader.readOwnerPositions.mock.calls).toEqual([[INTERMEDIARY]]);
    expect(reader.readMarketPosition.mock.calls).toEqual([
      [INTERMEDIARY, BASE_MARKET],
      [INTERMEDIARY, ARB_MARKET],
    ]);
  });

  it('adds repaid loans read per market, once per loan', async () => {
    connect('sol', 'So1anaWa11et');
    reader.readOwnerPositions.mockResolvedValue([fakeLoan()]);
    reader.readMarketPosition.mockImplementation(async (_owner, market) =>
      market === BASE_MARKET ? fakeLoan() : fakeRepaidLoan({ ...ARB_MARKET }),
    );

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.positions.map(({ status }) => status)).toEqual([
      'active',
      'repaid',
    ]);
  });

  it('fills missing risk figures from the market', async () => {
    connect('sol', 'So1anaWa11et');
    reader.readOwnerPositions.mockResolvedValue([
      fakeLoan({
        liquidationLtv: null,
        borrowApr: null,
        interestPerYearUsd: null,
        liquidationPrice: null,
      }),
    ]);
    reader.readMarketRisk.mockResolvedValue({
      assets: {
        weth: { liquidationThreshold: 0.8, borrowApr: null },
        usdc: { liquidationThreshold: 0.78, borrowApr: 0.05 },
      },
    });

    const { result } = render(usePositions);

    await waitFor(() =>
      expect(result.current.positions[0]?.liquidationLtv).toBe(0.8),
    );

    expect(reader.readMarketRisk).toHaveBeenCalledWith(BASE_MARKET);
    expect(result.current.positions[0]).toMatchObject({
      borrowApr: 0.05,
      liquidationPrice: { symbol: 'WETH', usd: 1500 },
    });
  });

  it('keeps the loans read when another read fails', async () => {
    connect('evm', EVM_WALLET);
    reader.readOwnerPositions.mockImplementation(async (owner) => {
      if (owner === EVM_WALLET) {
        throw new Error('vaults.fyi answered 500');
      }

      return [fakeLoan()];
    });

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.partial).toBe(true);
    expect(result.current.positions).toHaveLength(1);
  });

  it('is an error when every read fails', async () => {
    connect('sol', 'So1anaWa11et');
    reader.readOwnerPositions.mockRejectedValue(new Error('down'));
    reader.readMarketPosition.mockRejectedValue(new Error('down'));

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('error'));

    reader.readOwnerPositions.mockResolvedValue([fakeLoan()]);
    reader.readMarketPosition.mockResolvedValue(null);
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.positions).toHaveLength(1);
  });

  it('is an error when the intermediary cannot be looked up', async () => {
    connect('sol', 'So1anaWa11et');
    intents.getIntermediary.mockRejectedValueOnce(new Error('down'));

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('reads the dev override instead of the wallet in dev', async () => {
    vi.stubEnv(
      'VITE_DEBUG_POSITIONS_OWNER',
      '0x00000000000000000000000000000000000000CC',
    );
    connect('evm', EVM_WALLET);

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(reader.readOwnerPositions.mock.calls).toEqual([
      ['0x00000000000000000000000000000000000000cc'],
    ]);
    expect(intents.getIntermediary).not.toHaveBeenCalled();
  });

  it('ignores the dev override outside dev', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv(
      'VITE_DEBUG_POSITIONS_OWNER',
      '0x00000000000000000000000000000000000000CC',
    );
    connect('sol', 'So1anaWa11et');

    const { result } = render(usePositions);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(reader.readOwnerPositions.mock.calls).toEqual([[INTERMEDIARY]]);
  });
});

describe('usePositionsCount', () => {
  it('counts loans, repaid ones included, and keeps the count on error', async () => {
    connect('sol', 'So1anaWa11et');
    reader.readOwnerPositions.mockResolvedValue([fakeLoan()]);
    reader.readMarketPosition.mockImplementation(async (_owner, market) =>
      market === ARB_MARKET ? fakeRepaidLoan({ ...ARB_MARKET }) : null,
    );

    const { result, client } = render(usePositionsCount);

    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).toBe(2));

    reader.readOwnerPositions.mockRejectedValue(new Error('down'));
    reader.readMarketPosition.mockRejectedValue(new Error('down'));
    await act(() => client.refetchQueries({ queryKey: ['positions'] }));

    expect(result.current).toBe(2);
  });

  it("drops the count when the wallet changes, rather than show the old one's", async () => {
    connect('sol', 'So1anaWa11et');
    reader.readOwnerPositions.mockResolvedValue([fakeLoan()]);

    const { result, rerender } = render(usePositionsCount);

    await waitFor(() => expect(result.current).toBe(1));

    // Another wallet whose intermediary is still being looked up.
    intents.getIntermediary.mockImplementationOnce(() => new Promise(() => {}));
    connect('sol', 'An0therWa11et');
    rerender(undefined);

    expect(result.current).toBeUndefined();
  });
});

describe('useRefreshPositionsOnDone', () => {
  it('refreshes once per done borrow', async () => {
    connect('sol', 'So1anaWa11et');

    const { result, rerender } = render(({ done }: { done?: string }) => {
      useRefreshPositionsOnDone(
        done ? { kind: 'done', executionId: done } : { kind: 'pending' },
      );

      return usePositions();
    }, {});

    await waitFor(() => expect(result.current.status).toBe('success'));
    reader.readOwnerPositions.mockClear();

    rerender({ done: 'exec-1' });
    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(1),
    );

    rerender({ done: 'exec-1' });
    rerender({ done: undefined });

    expect(reader.readOwnerPositions).toHaveBeenCalledTimes(1);
  });

  it('reads positions again as vaults.fyi catches up', async () => {
    connect('sol', 'So1anaWa11et');

    const { result, rerender } = render(({ done }: { done?: string }) => {
      useRefreshPositionsOnDone(
        done ? { kind: 'done', executionId: done } : { kind: 'pending' },
      );

      return usePositions();
    }, {});

    await waitFor(() => expect(result.current.status).toBe('success'));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    reader.readOwnerPositions.mockClear();

    // The dialog closing after done does not stop the follow-ups.
    rerender({ done: 'exec-1' });
    rerender({ done: undefined });
    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(1),
    );

    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(2),
    );

    await act(() => vi.advanceTimersByTimeAsync(20_000));
    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(3),
    );
  });

  it('keeps the follow-ups after the page unmounts (View position)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const { client, unmount } = render(() =>
      useRefreshPositionsOnDone({ kind: 'done', executionId: 'exec-2' }),
    );

    const invalidate = vi.spyOn(client, 'invalidateQueries');

    unmount();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['positions'] });
  });
});
