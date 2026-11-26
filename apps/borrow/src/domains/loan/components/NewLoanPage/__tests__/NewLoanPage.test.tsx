import { IntentsConnectApiError } from '@aurora-is-near/intents-connect';
import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Execution, RunnerEvent } from '@aurora-is-near/intents-connect';
import type {
  UseExecutionOptions,
  UseExecutionResult,
} from '@aurora-is-near/intents-connect/react';

import { App } from '@/App';
import { createAppRouter } from '@/router';
import { dryExecution, dryPreview } from '@/tests/executionFixtures';
import { FAKE_BASE, usdc, weth } from '@/tests/fakeMarkets';
import { BORROW_DELAYED_AFTER_MS } from '@/domains/borrow/utils/classifyBorrowError';
import { deferred, stepTexts } from '@/tests/helpers';

import type { BorrowRequest } from '../../../hooks/useLoanForm';

/*
 * The New loan tab's borrow, end to end over a fake runner: the ready call
 * to action previews the loan, the confirm dialog runs it, the pending
 * dialog follows the runner's events and done goes to My positions. The
 * form itself is replaced by its call to action (its own tests cover it).
 */

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  family: 'evm' as const,
}));

/** The fake `useExecution`'s result, and the `onEvent` it was given. */
const sdk = vi.hoisted(() => ({
  result: null as UseExecutionResult | null,
  onEvent: undefined as ((event: RunnerEvent) => void) | undefined,
  /** The wallet's open executions, before a borrow runs. */
  open: [] as Execution[],
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('@/tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('@/domains/markets/aaveV3', async () =>
  (await import('@/tests/aaveV3Mock')).createAaveV3Mock(),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) => ({
  ...(await importOriginal()),
  // The borrow flow lists the wallet's open executions before it runs one.
  useIntentsConnect: () => ({
    api: { listExecutions: async () => sdk.open },
    wallet: null,
  }),
  useExecution: (options: UseExecutionOptions = {}) => {
    sdk.onEvent = options.onEvent;

    if (!sdk.result) {
      throw new Error('no fake execution');
    }

    return sdk.result;
  },
}));

/** 3,000 USDC on Arbitrum, as WETH on Aave Base, at LTV 50%. */
const REQUEST: BorrowRequest = {
  // The App's fake adapter is `aave-v3`.
  market: { ...FAKE_BASE, provider: 'aave-v3' },
  collateral: weth(),
  borrow: usdc(),
  origin: { assetId: 'nep141:arb-usdc', chain: 'arb', decimals: 6 },
  amount: 3_000_000_000n,
  ltv: 50,
  estimatedBorrowAmount: 1_500_000_000n,
  recipient: undefined,
  fundingRows: undefined,
  paid: {
    assetId: 'nep141:arb-usdc',
    symbol: 'USDC',
    chain: 'arb',
    decimals: 6,
    amount: 5_000_000_000n,
  },
};

vi.mock('../../NewLoanForm/NewLoanForm', () => ({
  NewLoanForm: ({
    onBorrow,
    borrowing,
  }: {
    onBorrow?: (request: BorrowRequest) => void;
    borrowing?: boolean;
  }) => (
    <button
      aria-busy={borrowing}
      type="button"
      onClick={() => onBorrow?.(REQUEST)}>
      Borrow 1,485 USDC on Aave
    </button>
  ),
}));

const EXECUTION_ID = 'exec-1';

const fakeExecution = (run: Promise<Execution>): UseExecutionResult => ({
  phase: 'idle',
  hasSubmittedSignature: false,
  isCancelling: false,
  isBusy: false,
  preview: vi.fn().mockImplementation(async (plan) => dryPreview(plan)),
  run: vi.fn(() => run),
  previewSteps: vi.fn(),
  runSteps: vi.fn(),
  runOut: vi.fn(),
  resume: vi.fn(),
  retryDeposit: vi.fn(),
  cancel: vi.fn(async () => {}),
});

const emit = (...events: RunnerEvent[]) =>
  act(() => {
    events.forEach((event) => sdk.onEvent?.(event));
  });

let run = deferred<Execution>();

beforeEach(() => {
  run = deferred<Execution>();
  sdk.result = fakeExecution(run.promise);
  sdk.open = [];
});

const renderPage = async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] });

  render(<App router={createAppRouter(history)} />);

  const cta = await screen.findByRole('button', {
    name: 'Borrow 1,485 USDC on Aave',
  });

  return { history, cta };
};

describe('NewLoanPage', () => {
  it('previews the ready loan and confirms it in a dialog', async () => {
    const user = userEvent.setup();
    const { cta } = await renderPage();

    await user.click(cta);

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    // The dry run: 0.995 WETH expected, 0.99 at least, 0.01 WETH fee; the
    // borrow is 50% of the minimum, 1,485 USDC.
    expect(within(dialog).getByText('Supply').nextSibling).toHaveTextContent(
      '≈ 0.995 WETH · Base',
    );
    expect(
      within(dialog).getByText('Minimum received').nextSibling,
    ).toHaveTextContent('0.99 WETH');
    expect(within(dialog).getByText('Borrow').nextSibling).toHaveTextContent(
      '1,485 USDC · Base',
    );
    expect(
      within(dialog).getByText('Borrow fee').nextSibling,
    ).toHaveTextContent('−0.01 WETH');
    expect(sdk.result?.preview).toHaveBeenCalledTimes(2);
  });

  it('runs the confirmed loan, follows the runner through the steps without letting the dialog close, and goes to the position', async () => {
    const user = userEvent.setup();
    const { cta, history } = await renderPage();

    await user.click(cta);
    await user.click(
      await screen.findByRole('button', { name: 'Confirm in wallet' }),
    );

    expect(sdk.result?.run).toHaveBeenCalledOnce();

    emit(
      { type: 'phase', phase: 'awaiting-signature' },
      { type: 'created', executionId: EXECUTION_ID },
    );

    expect(stepTexts()).toEqual([
      'In progress: Sign and deposit',
      'Waiting: Bridge the collateral',
      'Waiting: Open the loan and deliver USDC',
    ]);

    emit({ type: 'status', status: 'DEPOSIT_PROCESSING' });

    expect(stepTexts()).toEqual([
      'Done: Sign and deposit',
      'In progress: Bridge the collateral',
      'Waiting: Open the loan and deliver USDC',
    ]);

    // Pending: Escape does not close it.
    await user.keyboard('{Escape}');

    expect(
      screen.getByRole('dialog', { name: 'Confirm loan' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();

    emit({ type: 'status', status: 'OPERATION_PROCESSING' });

    expect(stepTexts()).toEqual([
      'Done: Sign and deposit',
      'Done: Bridge the collateral',
      'In progress: Open the loan and deliver USDC',
    ]);

    await act(async () => {
      run.resolve({ ...dryExecution(), id: EXECUTION_ID, status: 'SUCCESS' });
    });

    const done = await screen.findByRole('dialog', { name: 'Loan opened' });

    expect(done).toHaveAccessibleDescription(
      '1,485 USDC is on its way to your wallet.',
    );

    await user.click(screen.getByRole('button', { name: 'View position' }));

    await waitFor(() => expect(history.location.pathname).toBe('/positions'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the confirm dialog on Cancel and leaves the borrow', async () => {
    const user = userEvent.setup();
    const { cta } = await renderPage();

    await user.click(cta);
    await screen.findByRole('dialog', { name: 'Confirm loan' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    expect(sdk.result?.run).not.toHaveBeenCalled();
  });

  describe('delayed', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('closes the dialog on "Close and keep tracking" while the borrow stays pending', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { cta } = await renderPage();

      await user.click(cta);
      await user.click(
        await screen.findByRole('button', { name: 'Confirm in wallet' }),
      );

      emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      act(() => {
        vi.advanceTimersByTime(BORROW_DELAYED_AFTER_MS);
      });

      expect(await screen.findByText('Taking longer than usual')).toBeVisible();

      await user.click(
        screen.getByRole('button', { name: 'Close and keep tracking' }),
      );

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );

      // Still tracked: the run is not cancelled.
      expect(sdk.result?.cancel).not.toHaveBeenCalled();
    });

    it('ignores a new borrow while one is tracked, and still shows the original done dialog', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { cta } = await renderPage();

      await user.click(cta);
      await user.click(
        await screen.findByRole('button', { name: 'Confirm in wallet' }),
      );

      emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      act(() => {
        vi.advanceTimersByTime(BORROW_DELAYED_AFTER_MS);
      });

      await user.click(
        await screen.findByRole('button', { name: 'Close and keep tracking' }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );

      const preview = sdk.result?.preview as ReturnType<typeof vi.fn>;
      const previews = preview.mock.calls.length;

      expect(cta).toHaveAttribute('aria-busy', 'true');

      await user.click(cta);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(preview).toHaveBeenCalledTimes(previews);

      await act(async () => {
        run.resolve({ ...dryExecution(), id: EXECUTION_ID, status: 'SUCCESS' });
      });

      expect(
        await screen.findByRole('dialog', { name: 'Loan opened' }),
      ).toHaveAccessibleDescription('1,485 USDC is on its way to your wallet.');
    });
  });
});

describe('NewLoanPage: the API refuses the borrow', () => {
  const noLiquidity = () =>
    new IntentsConnectApiError('Intents Connect API error', 400, {
      error: 'No liquidity available',
    });

  it('shows the error dialog when the run is refused, without crashing the page', async () => {
    const user = userEvent.setup();
    const { cta } = await renderPage();

    await user.click(cta);
    await user.click(
      await screen.findByRole('button', { name: 'Confirm in wallet' }),
    );

    await act(async () => {
      run.reject(noLiquidity());
    });

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(
      within(dialog).getByText('No liquidity available'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/useTheme must be used/)).not.toBeInTheDocument();
    // The page behind the dialog still renders: the header's theme switch.
    expect(
      screen.getByRole('button', { name: /theme/, hidden: true }),
    ).toBeInTheDocument();
  });

  it('shows the error dialog when the preview is refused, without crashing the page', async () => {
    const user = userEvent.setup();

    sdk.result = {
      ...fakeExecution(run.promise),
      preview: vi.fn().mockRejectedValue(noLiquidity()),
    };

    const { cta } = await renderPage();

    await user.click(cta);

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(
      within(dialog).getByText('No liquidity available'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/useTheme must be used/)).not.toBeInTheDocument();
  });
});
