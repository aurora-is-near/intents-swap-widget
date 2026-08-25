import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type Execution,
  type ExecutionPlan,
  type IntentsConnectApi,
  noopLogger,
  type Recipe,
  type Step,
  type WalletConnector,
} from '@/index';

import { IntentsConnectProvider } from '@/react/IntentsConnectProvider';
import { useExecution } from '@/react/useExecution';

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const recipe: Recipe<void> = {
  id: 'test',
  intent: 'test',
  title: 'Test',
  flow: 'bridge-in',
  type: 'evm',
  destination: {
    chain: 'base',
    assetId: 'nep141:base-usdc',
    tokenAddress: USDC,
  },
  buildSteps: ({ amount }): Step[] => [
    {
      to: USDC,
      functionSignature: 'transfer(address,uint256)',
      parameters: ['0xPool', amount],
      value: '0',
    },
  ],
};

const execution = (status: Execution['status'] = 'SUCCESS'): Execution => ({
  id: 'exec-1',
  status,
  quote: {
    amount: '1000',
    amountIn: '1000',
    amountOut: '950',
    minAmountOut: '900',
    depositAddress: 'deposit-address',
    depositMemo: null,
  },
  details: {
    intermediaryAddress: '0xIntermediary',
    networkFee: '70',
    signingStandard: 'erc191',
    payload: {
      standard: 'erc191',
      payload_json: '{}',
      payload_bytes_base64: 'e30=',
    },
  },
  steps: [],
});

const api = (): IntentsConnectApi => ({
  getIntermediary: vi.fn().mockResolvedValue({
    originAccount: ADDRESS,
    originType: 'evm',
    evm: '0xIntermediary',
    solana: null,
  }),
  createExecution: vi.fn().mockResolvedValue(execution('CREATED')),
  createStepsExecution: vi.fn().mockResolvedValue(execution('CREATED')),
  listSupportedTokens: vi.fn().mockResolvedValue({ in: [], out: [] }),
  submitSignature: vi
    .fn()
    .mockResolvedValue({ status: 'SIGNED_PENDING_DEPOSIT' }),
  recordDeposit: vi.fn().mockResolvedValue(undefined),
  listExecutions: vi.fn(async (_w: string, query?: { id?: string }) =>
    query?.id ? [execution('SUCCESS')] : [],
  ),
  deleteExecution: vi.fn().mockResolvedValue(undefined),
});

const wallet = (): WalletConnector => ({
  id: 'test',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({
    evm: {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [ADDRESS] : `0x${'ab'.repeat(64)}1b`,
      ),
    },
  }),
  makeTransfer: vi.fn().mockResolvedValue({ hash: '0xdeposit' }),
});

const plan: ExecutionPlan<void> = {
  recipe,
  params: undefined,
  quote: {
    originAsset: 'nep141:sol.omft.near',
    destinationAsset: 'nep141:base-usdc',
    amount: '1000',
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
  },
  originChain: 'base',
  originToken: { contractAddress: USDC, decimals: 6 },
  depositViaWallet: true,
};

type HarnessProps = {
  onReady?: (run: () => Promise<unknown>) => void;
};

let renderCount = 0;

const Harness = ({ onReady }: HarnessProps) => {
  const execution$ = useExecution();

  renderCount += 1;
  onReady?.(() => execution$.run(plan));

  return (
    <div>
      <span data-testid="phase">{execution$.phase}</span>
      <span data-testid="status">{execution$.status ?? '-'}</span>
      <span data-testid="deposit">{execution$.depositAddress ?? '-'}</span>
      <span data-testid="busy">{String(execution$.isBusy)}</span>
    </div>
  );
};

const renderHarness = (connector: WalletConnector | null) => {
  let start: (() => Promise<unknown>) | undefined;

  render(
    <IntentsConnectProvider
      api={api()}
      wallet={connector}
      logger={noopLogger}
      pollIntervalMs={0}>
      <Harness
        onReady={(run) => {
          start = run;
        }}
      />
    </IntentsConnectProvider>,
  );

  return () => start!();
};

// Auto-cleanup only registers under vitest `globals: true`, so unmount explicitly.
afterEach(cleanup);

describe('useExecution', () => {
  it('starts idle and not busy', () => {
    renderHarness(wallet());

    expect(screen.getByTestId('phase')).toHaveTextContent('idle');
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
  });

  it('re-renders through to success as the runner advances', async () => {
    const start = renderHarness(wallet());

    await act(async () => {
      await start();
    });

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('SUCCESS');
    expect(screen.getByTestId('deposit')).toHaveTextContent('deposit-address');
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
  });

  it('surfaces a guard error instead of throwing when no wallet is connected', async () => {
    const start = renderHarness(null);

    await expect(start()).rejects.toMatchObject({
      code: 'WALLET_NOT_CONNECTED',
    });
    expect(screen.getByTestId('phase')).toHaveTextContent('idle');
  });

  it('throws a helpful error when used outside the provider', () => {
    expect(() => render(<Harness />)).toThrow(/IntentsConnectProvider/);
  });
});

describe('runner identity', () => {
  /**
   * Most React connectors return a fresh object every render. Depending on that
   * identity rebuilt the runner on every render — and because the runner emits
   * events that cause renders, a live execution was reset to `idle` mid-flight.
   */
  const UnstableWalletApp = ({
    onReady,
  }: {
    onReady: (run: () => Promise<unknown>) => void;
  }) => {
    const [, forceRender] = useState(0);

    // A new connector object on every render, same account.
    const unstable: WalletConnector = { ...wallet() };

    return (
      <IntentsConnectProvider
        api={api()}
        wallet={unstable}
        logger={noopLogger}
        pollIntervalMs={0}>
        <Harness onReady={onReady} />
        <button type="button" onClick={() => forceRender((n) => n + 1)}>
          rerender
        </button>
      </IntentsConnectProvider>
    );
  };

  it('survives a connector rebuilt on every render', async () => {
    let start: (() => Promise<unknown>) | undefined;

    render(
      <UnstableWalletApp
        onReady={(run) => {
          start = run;
        }}
      />,
    );

    await act(async () => {
      await start!();
    });

    // Before the fix the runner was rebuilt mid-run and the UI snapped back to
    // idle with the completed execution stranded on an orphaned store.
    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('SUCCESS');
  });

  it('keeps the same phase across an unrelated re-render', async () => {
    let start: (() => Promise<unknown>) | undefined;

    render(
      <UnstableWalletApp
        onReady={(run) => {
          start = run;
        }}
      />,
    );

    await act(async () => {
      await start!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success');
    });

    // A render triggered by something else must not reset the runner's store.
    await act(async () => {
      screen.getByText('rerender').click();
    });

    expect(screen.getByTestId('phase')).toHaveTextContent('success');
  });
});
