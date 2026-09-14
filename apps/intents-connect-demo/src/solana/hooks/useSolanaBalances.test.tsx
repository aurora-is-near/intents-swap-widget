import { createElement } from 'react';
import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Phase } from '@aurora-is-near/intents-connect';

import { fetchSolanaBalances } from '../balances';
import { useSolanaBalances } from './useSolanaBalances';

const context = vi.hoisted(() => ({
  address: 'walletA',
  getIntermediary: vi.fn(),
}));

vi.mock('@aurora-is-near/intents-connect/react', () => ({
  useIntentsConnect: () => ({
    api: { getIntermediary: context.getIntermediary },
    wallet: context.address
      ? { getAddress: () => context.address, signingStandard: 'erc191' }
      : null,
  }),
}));
vi.mock('../balances', () => ({ fetchSolanaBalances: vi.fn() }));
vi.mock('../client', () => ({ getSolanaConnection: () => 'rpc' }));

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) =>
  createElement(QueryClientProvider, { client }, children);

beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient();
  context.address = 'walletA';
  context.getIntermediary.mockImplementation(async (wallet: string) => ({
    solana: `${wallet}-solana`,
  }));
  vi.mocked(fetchSolanaBalances).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

describe('Solana balances panel queries', () => {
  it('reads the connected origin wallet’s intermediary on mount and isolates account changes', async () => {
    const h = renderHook(() => useSolanaBalances('idle'), { wrapper });

    await waitFor(() => expect(h.result.current.isSuccess).toBe(true));

    expect(fetchSolanaBalances).toHaveBeenCalledWith('rpc', 'walletA-solana');

    context.address = 'walletB';
    h.rerender();

    expect(h.result.current.data).toBeUndefined();

    await waitFor(() =>
      expect(h.result.current.data?.intermediary).toBe('walletB-solana'),
    );

    expect(fetchSolanaBalances).toHaveBeenLastCalledWith(
      'rpc',
      'walletB-solana',
    );
  });

  it('loads holdings after remount without requiring a purchase or execution history', async () => {
    const first = renderHook(() => useSolanaBalances('idle'), { wrapper });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    client.clear();
    const second = renderHook(() => useSolanaBalances('idle'), { wrapper });

    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(fetchSolanaBalances).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failed'] as Phase[])(
    'refreshes after %s and cancels the delayed refresh on disconnect',
    async (phase) => {
      const h = renderHook((value: Phase) => useSolanaBalances(value), {
        initialProps: 'idle' as Phase,
        wrapper,
      });

      await waitFor(() => expect(h.result.current.isSuccess).toBe(true));
      vi.useFakeTimers();
      h.rerender(phase);
      await act(() => vi.advanceTimersByTimeAsync(0));

      expect(fetchSolanaBalances).toHaveBeenCalledTimes(2);

      context.address = '';
      h.rerender(phase);
      await act(() => vi.advanceTimersByTimeAsync(5000));

      expect(fetchSolanaBalances).toHaveBeenCalledTimes(2);
    },
  );
});
