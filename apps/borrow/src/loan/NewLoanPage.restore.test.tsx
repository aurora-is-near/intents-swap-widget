import '../tests/pointerEvent';

import type { Execution, RunnerEvent } from '@aurora-is-near/intents-connect';
import type {
  UseExecutionOptions,
  UseExecutionResult,
  UseWalletExecutionsOptions,
  UseWalletExecutionsResult,
} from '@aurora-is-near/intents-connect/react';
import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { createAppRouter } from '../router';
import { dryExecution, dryPreview } from '../tests/executionFixtures';
import { FAKE_BASE, usdc, weth } from '../tests/fakeMarkets';
import {
  PENDING_BORROW_STORAGE_KEY,
  readPendingBorrow,
  savePendingBorrow,
} from './execution/pendingBorrowStore';
import { AAVE_BORROW_INTENT } from './execution/recipe';
import type { BorrowRequest } from './useLoanForm';

/*
 * A borrow surviving a reload: the created execution is kept per wallet
 * until it is over, and on mount an in-flight borrow of the connected
 * wallet is resumed and its pending dialog reopened, with the kept rows or
 * generic ones from the execution.
 */

const WALLET = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  family: 'evm' as const,
}));

const sdk = vi.hoisted(() => ({
  result: null as UseExecutionResult | null,
  onEvent: undefined as ((event: RunnerEvent) => void) | undefined,
  /** What `useWalletExecutions` answers, and what it was asked. */
  executions: null as UseWalletExecutionsResult | null,
  executionsOptions: undefined as UseWalletExecutionsOptions | undefined,
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('../markets/aaveV3', async () =>
  (await import('../tests/aaveV3Mock')).createAaveV3Mock(),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) => ({
  ...(await importOriginal()),
  useExecution: (options: UseExecutionOptions = {}) => {
    sdk.onEvent = options.onEvent;

    if (!sdk.result) {
      throw new Error('no fake execution');
    }

    return sdk.result;
  },
  useWalletExecutions: (options: UseWalletExecutionsOptions = {}) => {
    sdk.executionsOptions = options;

    if (!sdk.executions) {
      throw new Error('no fake executions');
    }

    return sdk.executions;
  },
}));

const REQUEST: BorrowRequest = {
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

vi.mock('./NewLoanForm', () => ({
  NewLoanForm: ({
    onBorrow,
  }: {
    onBorrow?: (request: BorrowRequest) => void;
  }) => (
    <button type="button" onClick={() => onBorrow?.(REQUEST)}>
      Borrow 1,485 USDC on Aave
    </button>
  ),
}));

const EXECUTION_ID = 'exec-restored-0001';

/** A promise to settle from the test. */
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

const fakeExecution = (
  run: Promise<Execution>,
  resume: Promise<Execution>,
): UseExecutionResult => ({
  phase: 'idle',
  hasSubmittedSignature: false,
  isCancelling: false,
  isBusy: false,
  preview: vi.fn().mockImplementation(async (plan) => dryPreview(plan)),
  run: vi.fn(() => run),
  previewSteps: vi.fn(),
  runSteps: vi.fn(),
  runOut: vi.fn(),
  resume: vi.fn(() => resume),
  retryDeposit: vi.fn(),
  cancel: vi.fn(async () => {}),
});

/**
 * The hook's answer: `executions` is the render snapshot (maybe the cached
 * list of an earlier mount), `fresh` what the load after this mount brings
 * (`refresh()` resolves to it); the same list unless given.
 */
const walletExecutions = (
  executions: Execution[],
  fresh: Execution[] = executions,
): UseWalletExecutionsResult => ({
  executions,
  status: 'success',
  refresh: vi.fn(async () => fresh),
});

/** An in-flight execution of the wallet, a borrow unless `intent` says. */
const inFlight = (
  overrides: Partial<Execution> = {},
  intent: string = AAVE_BORROW_INTENT,
): Execution => {
  const execution = dryExecution();

  return {
    ...execution,
    id: EXECUTION_ID,
    status: 'DEPOSIT_PROCESSING',
    quote: {
      ...execution.quote,
      amountInUsd: '3000.12',
      amountOutUsd: '2985.5',
    },
    metadata: { intent },
    ...overrides,
  };
};

const emit = (...events: RunnerEvent[]) =>
  act(() => {
    events.forEach((event) => sdk.onEvent?.(event));
  });

const rowValue = (dialog: HTMLElement, label: string) =>
  within(dialog).getByText(label).nextSibling;

const stepTexts = () =>
  within(screen.getByRole('list', { name: 'Loan progress' }))
    .getAllByRole('listitem')
    .map((item) => {
      const read = item.cloneNode(true) as HTMLElement;

      read.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
        hidden.remove();
      });

      return read.textContent;
    });

let run = deferred<Execution>();
let resume = deferred<Execution>();

beforeEach(() => {
  wallet.address = WALLET;
  wallet.isConnected = true;
  run = deferred<Execution>();
  resume = deferred<Execution>();
  sdk.result = fakeExecution(run.promise, resume.promise);
  sdk.executions = walletExecutions([]);
  sdk.executionsOptions = undefined;
});

const renderPage = async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] });

  render(<App router={createAppRouter(history)} />);

  return screen.findByRole('button', { name: 'Borrow 1,485 USDC on Aave' });
};

const KEPT_ROWS: [string, string][] = [
  ['Supply', '0.995 WETH · Base'],
  ['Borrow', '1,485 USDC · Base'],
  ['Recipient', 'Your wallet 0x7a3f…9c21'],
];

describe('NewLoanPage: restoring a borrow', () => {
  it('keeps the created borrow’s id and rows for the wallet, and forgets them once it succeeds', async () => {
    const user = userEvent.setup();

    await user.click(await renderPage());
    await user.click(
      await screen.findByRole('button', { name: 'Confirm in wallet' }),
    );

    expect(window.localStorage.getItem(PENDING_BORROW_STORAGE_KEY)).toBeNull();

    emit(
      { type: 'phase', phase: 'awaiting-signature' },
      { type: 'created', executionId: EXECUTION_ID },
    );

    const record = readPendingBorrow(WALLET);

    expect(record).toMatchObject({
      executionId: EXECUTION_ID,
      borrowSymbol: 'USDC',
    });
    // The confirm dialog's rows, as shown.
    expect(record?.rows).toContainEqual(['Supply', '≈ 0.995 WETH · Base']);
    expect(record?.rows).toContainEqual(['Borrow', '1,485 USDC · Base']);
    expect(record?.rows).toContainEqual([
      'Recipient',
      'Your wallet 0x7a3f…9c21',
    ]);
    // Keyed by the wallet, under the one key.
    expect(
      Object.keys(
        JSON.parse(
          window.localStorage.getItem(PENDING_BORROW_STORAGE_KEY) ?? '{}',
        ),
      ),
    ).toEqual([WALLET]);

    emit({ type: 'status', status: 'OPERATION_PROCESSING' });

    expect(readPendingBorrow(WALLET)?.executionId).toBe(EXECUTION_ID);

    emit({ type: 'status', status: 'SUCCESS' });

    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  it.each(['DEPOSIT_FAILED', 'OPERATION_FAILED'] as const)(
    'forgets the kept borrow on %s',
    async (status) => {
      const user = userEvent.setup();

      await user.click(await renderPage());
      await user.click(
        await screen.findByRole('button', { name: 'Confirm in wallet' }),
      );

      emit({ type: 'created', executionId: EXECUTION_ID });

      expect(readPendingBorrow(WALLET)?.executionId).toBe(EXECUTION_ID);

      emit({ type: 'status', status });

      expect(readPendingBorrow(WALLET)).toBeUndefined();
    },
  );

  it('resumes the wallet’s in-flight borrow on mount and reopens the pending dialog with the kept rows', async () => {
    savePendingBorrow(WALLET, {
      executionId: EXECUTION_ID,
      rows: KEPT_ROWS,
      borrowSymbol: 'USDC',
    });
    sdk.executions = walletExecutions([inFlight()]);

    await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    // Only in-flight executions are asked for.
    expect(sdk.executionsOptions?.status).toEqual(
      expect.arrayContaining([
        'CREATED',
        'DEPOSIT_PENDING',
        'DEPOSIT_PROCESSING',
        'OPERATION_PENDING',
        'OPERATION_PROCESSING',
      ]),
    );
    expect(rowValue(dialog, 'Supply')).toHaveTextContent('0.995 WETH · Base');
    expect(rowValue(dialog, 'Borrow')).toHaveTextContent('1,485 USDC · Base');
    // DEPOSIT_PROCESSING: signed, the collateral is on its way.
    expect(stepTexts()).toEqual([
      'Done: Sign one intent',
      'In progress: Supply collateral and open the loan',
      'Waiting: Bridge and deliver USDC',
    ]);
    // Pending: no way to close it.
    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();

    // The resumed run's events move it on, and success clears the record.
    emit({ type: 'status', status: 'OPERATION_PROCESSING' });

    expect(stepTexts()[2]).toBe('In progress: Bridge and deliver USDC');

    await act(async () => {
      resume.resolve({ ...inFlight(), status: 'SUCCESS' });
    });

    expect(
      await screen.findByRole('dialog', { name: 'Loan opened' }),
    ).toBeInTheDocument();
    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  it('shows generic rows from the execution when nothing was kept for it', async () => {
    sdk.executions = walletExecutions([inFlight()]);

    await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    expect(rowValue(dialog, 'You pay')).toHaveTextContent('≈ $3,000');
    expect(rowValue(dialog, 'Supply')).toHaveTextContent('≈ $2,986');
    expect(rowValue(dialog, 'Status')).toHaveTextContent(
      'Bridging the collateral',
    );
    expect(rowValue(dialog, 'Execution')).toHaveTextContent('exec-r…0001');
    expect(stepTexts()[2]).toBe('Waiting: Bridge and deliver the funds');
  });

  it('drops a kept record of another execution and shows generic rows', async () => {
    savePendingBorrow(WALLET, {
      executionId: 'exec-older',
      rows: KEPT_ROWS,
      borrowSymbol: 'USDC',
    });
    sdk.executions = walletExecutions([inFlight()]);

    await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(rowValue(dialog, 'Status')).toHaveTextContent(
      'Bridging the collateral',
    );
    expect(within(dialog).queryByText('Borrow')).not.toBeInTheDocument();
    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  it('asks for the signature again when the borrow was created but not signed', async () => {
    sdk.executions = walletExecutions([
      inFlight({ status: 'CREATED', details: dryExecution().details }),
    ]);

    await renderPage();

    await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    expect(stepTexts()).toEqual([
      'In progress: Sign one intent',
      'Waiting: Supply collateral and open the loan',
      'Waiting: Bridge and deliver the funds',
    ]);
  });

  it('leaves another app’s in-flight execution alone and forgets a stale record', async () => {
    savePendingBorrow(WALLET, {
      executionId: EXECUTION_ID,
      rows: KEPT_ROWS,
    });
    sdk.executions = walletExecutions([inFlight({}, 'aave_supply')]);

    await renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sdk.result?.resume).not.toHaveBeenCalled();
    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  it('ignores the cached list of an earlier mount and acts on the fresh one', async () => {
    // Back on the tab: the provider's cache still lists a borrow that has
    // finished; the fresh load lists only the one running now.
    const running = inFlight({ id: 'exec-running' });

    savePendingBorrow(WALLET, {
      executionId: 'exec-running',
      rows: KEPT_ROWS,
      borrowSymbol: 'USDC',
    });
    sdk.executions = walletExecutions([inFlight()], [running]);

    await renderPage();

    await screen.findByRole('dialog', { name: 'Confirm loan' });

    // Resumed: the running borrow, never the finished one.
    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith('exec-running');
    expect(readPendingBorrow(WALLET)?.executionId).toBe('exec-running');
  });

  it('keeps the record when only the cached list misses the running borrow', async () => {
    // The cache, from before this borrow was created, is empty; the fresh
    // load fails (`refresh()` resolves to nothing).
    savePendingBorrow(WALLET, {
      executionId: EXECUTION_ID,
      rows: KEPT_ROWS,
      borrowSymbol: 'USDC',
    });
    sdk.executions = {
      ...walletExecutions([]),
      refresh: vi.fn(async () => undefined),
    };

    await renderPage();

    await act(async () => {});

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sdk.result?.resume).not.toHaveBeenCalled();
    expect(readPendingBorrow(WALLET)?.executionId).toBe(EXECUTION_ID);
  });

  it('does not resume a finished borrow the cached list still shows', async () => {
    sdk.executions = walletExecutions([inFlight()], []);

    await renderPage();

    await act(async () => {});

    expect(sdk.result?.resume).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('looks for nothing without a connected wallet', async () => {
    wallet.address = undefined;
    wallet.isConnected = false;
    sdk.executions = walletExecutions([inFlight()]);

    await renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sdk.result?.resume).not.toHaveBeenCalled();
  });
});
