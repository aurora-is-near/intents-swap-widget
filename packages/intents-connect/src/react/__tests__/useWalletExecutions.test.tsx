import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { IN_FLIGHT_STATUSES } from '@/types/execution';
import type { Execution } from '@/types/execution';
import type { WalletConnector } from '@/types/wallet';
import { IntentsConnectProvider, useWalletExecutions } from '@/react';

const ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';

const execution = (id: string, createdAt?: string) =>
  ({ id, createdAt, status: 'OPERATION_PENDING' }) as Execution;

const connectApi = () =>
  ({
    getIntermediary: vi.fn(),
    createExecution: vi.fn(),
    createStepsExecution: vi.fn(),
    listSupportedTokens: vi.fn(),
    submitSignature: vi.fn(),
    recordDeposit: vi.fn(),
    listExecutions: vi.fn(async () => [
      execution('undated'),
      execution('old', '2026-01-01T00:00:00Z'),
      execution('new', '2026-11-01T00:00:00Z'),
    ]),
    deleteExecution: vi.fn(),
  }) satisfies IntentsConnectApi;

const wallet = {
  id: 'evm',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({}),
} as unknown as WalletConnector;

const wrapperFor =
  (api: IntentsConnectApi, connected: WalletConnector | null) =>
  ({ children }: { children: ReactNode }) => (
    <IntentsConnectProvider api={api} wallet={connected}>
      {children}
    </IntentsConnectProvider>
  );

describe('useWalletExecutions', () => {
  it('lists nothing without a wallet', async () => {
    const api = connectApi();
    const { result } = renderHook(() => useWalletExecutions(), {
      wrapper: wrapperFor(api, null),
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(result.current).toMatchObject({ status: 'idle', executions: [] });
    expect(api.listExecutions).not.toHaveBeenCalled();
  });

  it("lists the wallet's executions by status, newest first", async () => {
    const api = connectApi();
    const { result } = renderHook(
      () => useWalletExecutions({ status: IN_FLIGHT_STATUSES }),
      { wrapper: wrapperFor(api, wallet) },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.executions.map(({ id }) => id)).toEqual([
      'new',
      'old',
      'undated',
    ]);
    expect(api.listExecutions).toHaveBeenCalledWith(ADDRESS, {
      status: [...IN_FLIGHT_STATUSES].sort(),
    });
  });

  it('shares one request between hooks asking for the same statuses', async () => {
    const api = connectApi();
    const { result } = renderHook(
      () => [
        useWalletExecutions({ status: ['CREATED', 'DEPOSIT_PENDING'] }),
        useWalletExecutions({ status: ['DEPOSIT_PENDING', 'CREATED'] }),
      ],
      { wrapper: wrapperFor(api, wallet) },
    );

    await waitFor(() => expect(result.current[1]!.status).toBe('success'));

    expect(api.listExecutions).toHaveBeenCalledTimes(1);
  });
});
