import { createElement } from 'react';
import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Phase } from '@aurora-is-near/intents-connect';

import { fetchAavePositions } from '../positions';
import { useAavePositions } from './useAavePositions';

const wallet = vi.hoisted(() => ({ address: '', family: 'evm' }));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', () => ({
  useIntentsConnectWallet: () => wallet,
}));
vi.mock('../positions', () => ({ fetchAavePositions: vi.fn() }));

let client: QueryClient;

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(QueryClientProvider, { client }, children);

beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient();
  wallet.address = '0x0000000000000000000000000000000000000001';
  wallet.family = 'evm';
  vi.mocked(fetchAavePositions).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

describe('useAavePositions', () => {
  it.each([
    { address: '', family: 'evm' },
    { address: 'solana-wallet', family: 'solana' },
  ])(
    'never reads positions for an unavailable EVM owner ($family, $address), even after success',
    async (disconnected) => {
      Object.assign(wallet, disconnected);
      vi.useFakeTimers();
      renderHook(() => useAavePositions('success'), { wrapper });
      await act(() => vi.advanceTimersByTimeAsync(5000));

      expect(fetchAavePositions).not.toHaveBeenCalled();
    },
  );

  it('refreshes immediately and after settlement when the tab runner succeeds', async () => {
    const { result, rerender } = renderHook(
      (phase: Phase) => useAavePositions(phase),
      { initialProps: 'idle' as Phase, wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchAavePositions).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    rerender('success');
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(fetchAavePositions).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(4000));

    expect(fetchAavePositions).toHaveBeenCalledTimes(3);
  });

  it('cancels the settlement refresh when the EVM wallet disconnects', async () => {
    const { result, rerender } = renderHook(
      (phase: Phase) => useAavePositions(phase),
      { initialProps: 'idle' as Phase, wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    vi.useFakeTimers();
    rerender('success');
    await act(() => vi.advanceTimersByTimeAsync(0));

    wallet.address = '';
    rerender('success');
    vi.mocked(fetchAavePositions).mockClear();
    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(fetchAavePositions).not.toHaveBeenCalled();
  });
});
