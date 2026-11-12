import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { IntentsConnectProvider, useSupportedTokens } from '@/react';

const USDC_BASE = {
  assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
  blockchain: 'base',
  contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  decimals: 6,
  symbol: 'USDC',
};

const SOL = {
  assetId: 'nep141:sol.omft.near',
  blockchain: 'sol',
  symbol: 'SOL',
};

const connectApi = () =>
  ({
    getIntermediary: vi.fn(),
    createExecution: vi.fn(),
    createStepsExecution: vi.fn(),
    listSupportedTokens: vi.fn(async () => ({ in: [SOL], out: [USDC_BASE] })),
    submitSignature: vi.fn(),
    recordDeposit: vi.fn(),
    listExecutions: vi.fn().mockResolvedValue([]),
    deleteExecution: vi.fn(),
  }) satisfies IntentsConnectApi;

describe('useSupportedTokens', () => {
  it('needs neither a wallet nor intentsApi, and shares one fetch', async () => {
    const api = connectApi();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <IntentsConnectProvider api={api} wallet={null}>
        {children}
      </IntentsConnectProvider>
    );

    const { result } = renderHook(
      () => [useSupportedTokens(), useSupportedTokens()] as const,
      { wrapper },
    );

    await waitFor(() => expect(result.current[0].status).toBe('success'));

    expect(result.current[0].origins).toEqual([SOL]);
    expect(result.current[0].destinations).toEqual([USDC_BASE]);
    expect(result.current[1].destinations).toEqual([USDC_BASE]);
    expect(api.listSupportedTokens).toHaveBeenCalledTimes(1);
    expect(api.listSupportedTokens).toHaveBeenCalledWith('inOperation');
  });

  it('keeps each flow apart', async () => {
    const api = connectApi();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <IntentsConnectProvider api={api} wallet={null}>
        {children}
      </IntentsConnectProvider>
    );

    const { result } = renderHook(
      () => useSupportedTokens({ flow: 'outOperation' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(api.listSupportedTokens).toHaveBeenCalledWith('outOperation');
  });

  it('throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useSupportedTokens())).toThrow(
      /inside an <IntentsConnectProvider>/,
    );
  });
});
