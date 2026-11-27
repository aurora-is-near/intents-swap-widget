import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  UseExecutionOptions,
  UseExecutionResult,
  UseWalletExecutionsOptions,
  UseWalletExecutionsResult,
} from '@aurora-is-near/intents-connect/react';
import type { Execution, RunnerEvent } from '@aurora-is-near/intents-connect';

import { App } from '@/App';
import { createAppRouter } from '@/router';
import { dryExecution, dryPreview } from '@/tests/executionFixtures';
import { FAKE_BASE, usdc, weth } from '@/tests/fakeMarkets';
import {
  PENDING_BORROW_STORAGE_KEY,
  readPendingBorrow,
  savePendingBorrow,
} from '@/domains/borrow/stores/pendingBorrowStore';
import { AAVE_BORROW_INTENT } from '@/domains/borrow/utils/recipe';
import { deferred, stepTexts } from '@/tests/helpers';

import type { BorrowRequest } from '../../../hooks/useLoanForm';

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
  /** The wallet's open executions, before a borrow runs. */
  open: [] as Execution[],
  /** What `useWalletExecutions` answers, and what it was asked. */
  executions: null as UseWalletExecutionsResult | null,
  executionsOptions: undefined as UseWalletExecutionsOptions | undefined,
}));

vi.mock('@/domains/wallet/hooks/useWallet', async () =>
  (await import('@/tests/walletMock')).createWalletMock(wallet),
);

vi.mock('@/domains/wallet/providers/WalletProvider', async () =>
  (await import('@/tests/walletMock')).createWalletProviderMock(),
);

// My positions reads through a fake reader (no loans by default) and a fake
// intermediary, so these tests never call vaults.fyi or the Intents Connect API.
vi.mock('@/domains/positions/vaultsFyi/createVaultsFyiReader', async () =>
  (await import('@/tests/fakePositions')).createVaultsFyiReaderMock(),
);

vi.mock('@/domains/positions/hooks/useOwnerAccounts', async () =>
  (await import('@/tests/fakePositions')).createOwnerAccountsMock(),
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

vi.mock('../../NewLoanForm/NewLoanForm', () => ({
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

let run = deferred<Execution>();
let resume = deferred<Execution>();

beforeEach(() => {
  wallet.address = WALLET;
  wallet.isConnected = true;
  run = deferred<Execution>();
  resume = deferred<Execution>();
  sdk.result = fakeExecution(run.promise, resume.promise);
  sdk.executions = walletExecutions([]);
  sdk.open = [];
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
      'Done: Sign and deposit',
      'In progress: Bridge the collateral',
      'Waiting: Open the loan and deliver USDC',
    ]);
    // Named as the previous borrow, and nothing to do: it can be closed.
    expect(
      within(dialog).getByText('Your previous borrow is still in progress'),
    ).toBeVisible();
    expect(
      within(dialog).getAllByRole('button', { name: 'Close' }).length,
    ).toBeGreaterThan(0);

    // The resumed run's events move it on, and success clears the record.
    emit({ type: 'status', status: 'OPERATION_PROCESSING' });

    expect(stepTexts()[2]).toBe('In progress: Open the loan and deliver USDC');

    await act(async () => {
      resume.resolve({ ...inFlight(), status: 'SUCCESS' });
    });

    expect(
      await screen.findByRole('dialog', { name: 'Loan opened' }),
    ).toBeInTheDocument();
    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  /** Signed, its deposit address known, and no deposit seen yet. */
  const awaitingDeposit = () => {
    const execution = inFlight();

    return inFlight({
      status: 'DEPOSIT_PENDING',
      quote: { ...execution.quote, depositAddress: '0xdeposit' },
      details: { ...execution.details, messageSigned: true },
    });
  };

  it('waits for the deposit of a borrow signed before the reload, without prompting the wallet', async () => {
    const user = userEvent.setup();

    savePendingBorrow(WALLET, {
      executionId: EXECUTION_ID,
      rows: KEPT_ROWS,
      borrowSymbol: 'USDC',
    });
    sdk.executions = walletExecutions([awaitingDeposit()]);

    await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    // A plain resume watches it: never `depositViaWallet`, so no prompt.
    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    expect(
      within(dialog).getByText(/Waiting for your deposit to arrive\./),
    ).toBeVisible();
    expect(stepTexts()[0]).toBe('In progress: Sign and deposit');
    expect(
      within(dialog).queryByRole('button', { name: 'Send deposit' }),
    ).not.toBeInTheDocument();

    // Nothing to do: it can be closed, and nothing is cancelled.
    await user.click(
      within(dialog).getAllByRole('button', { name: 'Close' }).at(-1) ?? dialog,
    );

    expect(
      screen.queryByRole('dialog', { name: 'Confirm loan' }),
    ).not.toBeInTheDocument();
    expect(sdk.result?.cancel).not.toHaveBeenCalled();
  });

  it('shows the previous borrow, named as such, when Borrow is clicked while it is on its way', async () => {
    const user = userEvent.setup();

    const cta = await renderPage();

    // Nothing restored on mount; the previous borrow is found on Borrow.
    sdk.open = [inFlight()];
    await user.click(cta);

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(
      within(dialog).getByText('Your previous borrow is still in progress'),
    ).toBeVisible();
    expect(rowValue(dialog, 'Execution')).toHaveTextContent('exec-r…0001');
    expect(stepTexts()[1]).toBe('In progress: Bridge the collateral');
    expect(sdk.result?.preview).not.toHaveBeenCalled();
    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    expect(
      within(dialog).queryByRole('button', { name: 'Confirm in wallet' }),
    ).not.toBeInTheDocument();
  });

  it('shows generic rows from the execution when nothing was kept for it', async () => {
    sdk.executions = walletExecutions([inFlight()]);

    await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Confirm loan' });

    expect(sdk.result?.resume).toHaveBeenCalledExactlyOnceWith(EXECUTION_ID);
    expect(rowValue(dialog, 'You pay')).toHaveTextContent('≈ $3,000');
    expect(rowValue(dialog, 'Supply')).toHaveTextContent('≈ $2,986');
    // No status row: read once, it would go stale; the steps say it.
    expect(within(dialog).queryByText('Status')).not.toBeInTheDocument();
    expect(rowValue(dialog, 'Execution')).toHaveTextContent('exec-r…0001');
    expect(stepTexts()[2]).toBe('Waiting: Open the loan and deliver the funds');
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

    expect(rowValue(dialog, 'Execution')).toHaveTextContent('exec-r…0001');
    expect(within(dialog).queryByText('Borrow')).not.toBeInTheDocument();
    expect(readPendingBorrow(WALLET)).toBeUndefined();
  });

  it.each<[string, Execution['status']]>([
    ['created', 'CREATED'],
    ['already awaiting its deposit', 'DEPOSIT_PENDING'],
  ])(
    'neither shows nor resumes a borrow %s but never signed',
    async (_, status) => {
      sdk.executions = walletExecutions([
        inFlight({
          status,
          details: { ...dryExecution().details, messageSigned: false },
        }),
      ]);

      await renderPage();
      await act(async () => {});

      expect(
        screen.queryByRole('dialog', { name: 'Confirm loan' }),
      ).not.toBeInTheDocument();
      expect(sdk.result?.resume).not.toHaveBeenCalled();
      expect(sdk.result?.cancel).not.toHaveBeenCalled();
    },
  );

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
