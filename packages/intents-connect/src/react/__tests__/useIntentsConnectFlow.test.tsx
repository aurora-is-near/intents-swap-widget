import { act, renderHook } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import type { WalletConnector } from '@/types/wallet';
import { IntentsConnectProvider, useIntentsConnectFlow } from '@/react';

const ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';

const connectApi = (): IntentsConnectApi => ({
  getIntermediary: vi.fn(),
  createExecution: vi.fn(),
  createStepsExecution: vi.fn(),
  listSupportedTokens: vi.fn(),
  submitSignature: vi.fn(),
  recordDeposit: vi.fn(),
  listExecutions: vi.fn().mockResolvedValue([]),
  deleteExecution: vi.fn(),
});

const wallet = (): WalletConnector => ({
  id: 'evm',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({}),
});

const wrapperFor =
  () =>
  ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <IntentsConnectProvider api={connectApi()} wallet={wallet()}>
        {children}
      </IntentsConnectProvider>
    </StrictMode>
  );

describe('useIntentsConnectFlow', () => {
  it('reports a plan that could not be built, and ignores double submits', async () => {
    let release: () => void = () => undefined;
    const buildPlan = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          release = () => reject(new Error('no route'));
        }),
    );

    const { result } = renderHook(
      () => useIntentsConnectFlow<{ amount: string }>({ buildPlan }),
      { wrapper: wrapperFor() },
    );

    let first: Promise<void> = Promise.resolve();

    act(() => {
      first = result.current.submit({ amount: '1' });
      void result.current.submit({ amount: '1' });
    });

    expect(result.current.isBusy).toBe(true);
    expect(buildPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await first;
    });

    expect(result.current.preparationError?.message).toBe('no route');
    expect(result.current.isBusy).toBe(false);
    expect(result.current.state).toBe('IDLE');
    expect(result.current.canCancel).toBe(false);
  });
});
