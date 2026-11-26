import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  getIntermediaryBalance,
  GuardError,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Execution,
  ExecutionPlan,
  RunnerEvent,
  StepsPlan,
  StepsPreview,
} from '@aurora-is-near/intents-connect';
import type {
  UseExecutionOptions,
  UseExecutionResult,
} from '@aurora-is-near/intents-connect/react';

import { dryExecution, dryPreview } from '@/tests/executionFixtures';
import {
  createFakeAdapter,
  FAKE_BASE,
  pairSnapshot,
  USD,
  usdc,
  weth,
} from '@/tests/fakeMarkets';
import { deferred } from '@/tests/helpers';

import { borrowDialogStep } from '../../components/BorrowDialog/BorrowDialog';
import {
  clearAllProgress,
  markCreated,
  markDepositSent,
} from '../../stores/executionProgress';
import { BORROW_DELAYED_AFTER_MS } from '../../utils/classifyBorrowError';
import { useBorrowFlow } from '../useBorrowFlow';
import type { BorrowParams } from '../../utils/recipe';
import type { BorrowFlowInput } from '../useBorrowFlow';

const WALLET_A = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

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
  /** The wallet's open executions, as `api.listExecutions` lists them. */
  open: [] as Execution[],
  listExecutions: vi.fn(),
}));

// The collateral waiting at the intermediary, for the steps-only retry.
vi.mock('@aurora-is-near/intents-connect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aurora-is-near/intents-connect')>()),
  getIntermediaryBalance: vi.fn(async () => '990000000000000000'),
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('@/tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('@aurora-is-near/intents-connect/react', () => ({
  useIntentsConnect: () => ({
    api: { listExecutions: sdk.listExecutions },
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

const EXECUTION_ID = 'exec-1';

const succeeded = (): Execution => ({
  ...dryExecution(),
  id: EXECUTION_ID,
  status: 'SUCCESS',
});

/**
 * Lets the pre-run lock check (`api.listExecutions`) settle, so a run held
 * open by the test has been called.
 */
const flushGate = async () => {
  // Microtasks only, so it works under fake timers too.
  for (let tick = 0; tick < 10; tick += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/** 0.98 WETH supplied once the 0.01 WETH fee is carved from the 0.99 waiting. */
const SPENDABLE = '980000000000000000';

/** `previewSteps()`: the plan back, prepared, `SPENDABLE` after the fee. */
const previewStepsDry = async (
  plan: StepsPlan<BorrowParams>,
): Promise<StepsPreview<BorrowParams>> => ({
  execution: dryExecution(),
  networkFee: '10000000000000000',
  spendable: SPENDABLE,
  plan: {
    ...plan,
    prepared: {
      steps: [],
      walletAddress: '0x00000000000000000000000000000000000000cc',
      intermediary: '0x00000000000000000000000000000000000000aa',
      amount: plan.amount,
      spendable: SPENDABLE,
      networkFee: '10000000000000000',
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
  },
});

/** `preview()`: the plan back, prepared, with the default dry run. */
const previewDry = async (plan: ExecutionPlan<BorrowParams>) =>
  dryPreview(plan);

const fakeExecution = (): UseExecutionResult => ({
  phase: 'idle',
  hasSubmittedSignature: false,
  isCancelling: false,
  isBusy: false,
  preview: vi.fn().mockImplementation(previewDry),
  run: vi.fn(async () => succeeded()),
  previewSteps: vi.fn().mockImplementation(previewStepsDry),
  runSteps: vi.fn(async () => succeeded()),
  runOut: vi.fn(),
  resume: vi.fn(async () => succeeded()),
  retryDeposit: vi.fn(async () => succeeded()),
  cancel: vi.fn(async () => {}),
});

const exec = () => {
  if (!sdk.result) {
    throw new Error('no fake execution');
  }

  return sdk.result;
};

const emit = (...events: RunnerEvent[]) =>
  act(() => {
    events.forEach((event) => sdk.onEvent?.(event));
  });

const input = (overrides: Partial<BorrowFlowInput> = {}): BorrowFlowInput => ({
  adapter: createFakeAdapter({
    getMarketSnapshot: async () => pairSnapshot(FAKE_BASE),
  }),
  market: FAKE_BASE,
  collateral: weth(),
  borrow: usdc(),
  origin: { assetId: 'nep141:arb-usdc', chain: 'arb', decimals: 6 },
  amount: 3_000_000_000n,
  ltv: 50,
  estimatedBorrowAmount: 1_500_000_000n,
  fundingRows: undefined,
  ...overrides,
});

const renderFlow = (options: Parameters<typeof useBorrowFlow>[0] = {}) =>
  renderHook(() => useBorrowFlow(options));

type Flow = ReturnType<typeof renderFlow>['result'];

const startFlow = async (flow: Flow, overrides?: Partial<BorrowFlowInput>) => {
  await act(() => flow.current.start(input(overrides)));
};

/** Previewed, confirmed, and `run()` held open until settled by the test. */
const confirmHeld = async (flow: Flow) => {
  const run = deferred<Execution>();

  vi.mocked(exec().run).mockReturnValueOnce(run.promise);
  await startFlow(flow);

  let confirmed: Promise<void> = Promise.resolve();

  await act(async () => {
    confirmed = flow.current.confirm();
    await flushGate();
  });

  return { run, confirmed };
};

/** Confirms a run that fails with `error`. */
const confirmFailing = async (flow: Flow, error: unknown) => {
  vi.mocked(exec().run).mockRejectedValueOnce(error);
  await startFlow(flow);
  await act(() => flow.current.confirm());
};

const EIP1193_REJECTION = { code: 4001, message: 'User rejected the request.' };

/** A wallet's 4001 as an `Error`, as a deposit transfer's cause carries it. */
const userRejection = () =>
  Object.assign(new Error('User rejected the request.'), { code: 4001 });

beforeEach(() => {
  sdk.result = fakeExecution();
  sdk.open = [];
  sdk.listExecutions.mockReset();
  sdk.listExecutions.mockImplementation(async () => sdk.open);
  clearAllProgress();
  vi.mocked(getIntermediaryBalance).mockResolvedValue('990000000000000000');
  wallet.address = WALLET_A;
  wallet.isConnected = true;
  wallet.connect.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBorrowFlow', () => {
  it('starts idle', () => {
    const { result } = renderFlow();

    expect(result.current.state).toEqual({ kind: 'idle' });
  });

  describe('the happy path', () => {
    it('previews, then confirms with the dry run and its figures', async () => {
      const { result } = renderFlow();
      const preview = deferred<void>();

      vi.mocked(exec().preview).mockImplementationOnce(async (plan) => {
        await preview.promise;

        return dryPreview(plan);
      });

      let started: Promise<void> = Promise.resolve();

      act(() => {
        started = result.current.start(input());
      });

      expect(result.current.state).toEqual({ kind: 'previewing' });

      await act(async () => {
        preview.resolve();
        await started;
      });

      const { state } = result.current;

      expect(state.kind).toBe('confirm');
      expect(exec().preview).toHaveBeenCalledTimes(2);

      if (state.kind === 'confirm') {
        // 0.99 WETH at $3,000 at LTV 50%.
        expect(state.preview.borrowAmount).toBe(1_485_000_000n);
        expect(state.figures.borrowAmount).toBe(1_485_000_000n);
        expect(state.figures.minimumReceived).toBe(990_000_000_000_000_000n);
      }
    });

    it("runs the dry run's plan as it is, through signing, the 3 steps and done", async () => {
      const onCreated = vi.fn();
      const { result } = renderFlow({ onCreated });
      const { run, confirmed } = await confirmHeld(result);
      const { state } = result.current;

      expect(state.kind).toBe('signing');

      // The plan of the second dry run, not a copy.
      const [[plan]] = vi.mocked(exec().run).mock.calls as [
        [ExecutionPlan<BorrowParams>],
      ];

      expect(plan.prepared).toBeDefined();
      expect(plan.params.borrowAmount).toBe('1485000000');

      await emit(
        { type: 'phase', phase: 'resolving-identity' },
        { type: 'phase', phase: 'creating' },
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'awaiting-signature' },
      );

      expect(result.current.state).toEqual({ kind: 'signing' });
      expect(onCreated).toHaveBeenCalledWith(EXECUTION_ID);

      // Submitting is still signing: the service has not accepted it yet.
      await emit({ type: 'phase', phase: 'submitting' });

      expect(result.current.state).toEqual({ kind: 'signing' });

      await emit({ type: 'phase', phase: 'awaiting-deposit' });

      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 0,
        executionId: EXECUTION_ID,
        waitingForDeposit: false,
      });

      await emit(
        { type: 'status', status: 'DEPOSIT_PENDING' },
        {
          type: 'deposit-address',
          address: '0xdep',
          memo: null,
        },
        { type: 'quoted', networkFee: '1', spendable: '2' },
      );

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 0 });

      await emit({ type: 'deposit-sent', txHash: '0xtx' });

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 1 });

      await emit(
        { type: 'phase', phase: 'settling' },
        { type: 'status', status: 'DEPOSIT_PROCESSING' },
      );

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 1 });

      await emit({ type: 'status', status: 'OPERATION_PROCESSING' });

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 2 });

      // A late or repeated status does not move a step back.
      await emit({ type: 'status', status: 'DEPOSIT_PENDING' });

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 2 });

      await act(async () => {
        run.resolve(succeeded());
        await confirmed;
      });

      expect(result.current.state).toEqual({
        kind: 'done',
        executionId: EXECUTION_ID,
      });
    });

    it('sends the recipient through to the plan', async () => {
      const { result } = renderFlow();

      await startFlow(result, {
        recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      const [[plan]] = vi.mocked(exec().preview).mock.calls as [
        [ExecutionPlan<BorrowParams>],
      ];

      expect(plan.params.recipient).toBe(
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      );
    });

    it('ignores runner events while nothing is running', async () => {
      const { result } = renderFlow();

      await emit({ type: 'phase', phase: 'creating' });

      expect(result.current.state).toEqual({ kind: 'idle' });
    });
  });

  describe('errors', () => {
    it('is rejected when the signature is declined, and offers a retry', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, EIP1193_REJECTION);

      expect(result.current.state).toEqual({
        kind: 'error',
        error: 'rejected',
        cause: EIP1193_REJECTION,
        step: 0,
      });
      expect(result.current.action).toBe('retry');
    });

    it('is noGas, before any dry run, when the origin chain has no gas', async () => {
      const { result } = renderFlow();
      const USDC_ON_BASE = 'nep141:base-0x8335.omft.near';

      await startFlow(result, {
        origin: {
          assetId: USDC_ON_BASE,
          chain: 'base',
          decimals: 6,
          contractAddress: '0x8335',
        },
        fundingRows: [{ assetId: USDC_ON_BASE, amount: 3_000_000_000n }],
      });

      expect(result.current.state).toMatchObject({
        kind: 'error',
        error: 'noGas',
      });
      expect(exec().preview).not.toHaveBeenCalled();
    });

    it("is noGas when the wallet can't pay for the deposit", async () => {
      const { result } = renderFlow();

      await confirmFailing(
        result,
        new DepositTransferError(EXECUTION_ID, {
          cause: { message: 'insufficient funds for gas * price + value' },
        }),
      );

      expect(result.current.state).toMatchObject({ error: 'noGas' });
    });

    it('is noLiquidity when the market, read afresh, can no longer lend it', async () => {
      const { result } = renderFlow();

      await startFlow(result, {
        adapter: createFakeAdapter({
          getMarketSnapshot: async () =>
            pairSnapshot(FAKE_BASE, {
              borrowable: [usdc({ availableLiquidity: 1_000_000_000n })],
            }),
        }),
      });

      expect(result.current.state).toMatchObject({
        kind: 'error',
        error: 'noLiquidity',
      });
      expect(result.current.action).toBe('close');
    });

    it('is quoteMoved when the bridge quote moved before signing, and offers a refresh', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, new GuardError('QUOTE_MOVED', 'moved'));

      expect(result.current.state).toMatchObject({
        error: 'quoteMoved',
        step: 0,
      });
      expect(result.current.action).toBe('refresh');
    });

    it('is unknown for anything else', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, new Error('boom'));

      expect(result.current.state).toMatchObject({ error: 'unknown' });
    });

    it('is busy for a wallet-lock guard, by its own recovery, not an earlier rejected deposit’s', async () => {
      const { result } = renderFlow();

      // The previous render's recovery: an earlier deposit transfer the user
      // rejected.
      exec().recovery = {
        kind: 'retry-transfer',
        executionId: EXECUTION_ID,
        cause: userRejection(),
      };

      await confirmFailing(
        result,
        new GuardError('EXECUTION_IN_FLIGHT', 'another execution is live', {
          executionId: EXECUTION_ID,
        }),
      );

      expect(result.current.state).toMatchObject({
        kind: 'error',
        error: 'busy',
      });
      expect(result.current.action).toBe('close');
    });

    describe('when the borrow step failed after the collateral arrived', () => {
      /** Signed, collateral delivered, OPERATION_FAILED; the market reads `after`. */
      const operationFailed = async (
        flow: Flow,
        after: ReturnType<typeof pairSnapshot>,
      ) => {
        const adapter = createFakeAdapter({
          getMarketSnapshot: async () => pairSnapshot(FAKE_BASE),
        });

        const run = deferred<Execution>();

        vi.mocked(exec().run).mockReturnValueOnce(run.promise);
        await startFlow(flow, { adapter });

        let confirmed: Promise<void> = Promise.resolve();

        await act(async () => {
          confirmed = flow.current.confirm();
          await flushGate();
        });

        adapter.getMarketSnapshot.mockResolvedValue(after);

        await emit(
          { type: 'created', executionId: EXECUTION_ID },
          { type: 'phase', phase: 'submitting' },
        );
        exec().hasSubmittedSignature = true;
        await emit({ type: 'status', status: 'OPERATION_FAILED' });

        await act(async () => {
          run.reject(new Error('execution OPERATION_FAILED'));
          await confirmed;
        });
      };

      /** Neither retry nor refresh bridges the funds in again. */
      const expectNoNewBridgeIn = async (flow: Flow) => {
        await act(() => flow.current.retry());
        await act(() => flow.current.refresh());

        // The two dry runs and the one run of the borrow itself.
        expect(exec().preview).toHaveBeenCalledTimes(2);
        expect(exec().run).toHaveBeenCalledTimes(1);
        expect(exec().runSteps).not.toHaveBeenCalled();
        expect(exec().resume).not.toHaveBeenCalled();
      };

      /** WETH fell to $1,800: the loan is above the max LTV now. */
      const PRICE_FELL = () =>
        pairSnapshot(FAKE_BASE, {
          collateral: [weth({ priceBase: 1_800n * USD })],
        });

      it('is priceMoved when the market, read afresh, blames the price, and offers the steps-only retry', async () => {
        const { result } = renderFlow();

        await operationFailed(result, PRICE_FELL());

        expect(result.current.state).toMatchObject({ error: 'priceMoved' });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.fundsWaitingExecutionId).toBe(EXECUTION_ID);
        expect(result.current.action).toBe('retry');
      });

      it('is pairUnsupported when the borrow action no longer covers the pair, and offers no retry', async () => {
        const { result } = renderFlow();

        await operationFailed(
          result,
          pairSnapshot(FAKE_BASE, {
            borrowable: [
              usdc({ unavailable: true, unavailableReason: 'coming-soon' }),
            ],
          }),
        );

        expect(result.current.state).toMatchObject({
          error: 'pairUnsupported',
        });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.action).toBe('close');
      });

      it('retries steps-only from the waiting collateral, re-sized at the fresh price, without a new bridge-in', async () => {
        const { result } = renderFlow();

        await operationFailed(result, PRICE_FELL());
        await act(() => result.current.retry());

        // The intermediary's WETH on Base is read.
        expect(getIntermediaryBalance).toHaveBeenCalledWith(
          expect.objectContaining({
            intermediary: { evm: '0x00000000000000000000000000000000000000aa' },
            destination: expect.objectContaining({ chain: 'base' }),
          }),
        );

        // Two steps-only dry runs over the 0.99 WETH waiting; the second
        // borrows 50% of the 0.98 WETH spendable at $1,800: $882.
        const { previewSteps } = exec();

        expect(previewSteps).toHaveBeenCalledTimes(2);

        const final = vi.mocked(previewSteps).mock.calls[1]?.[0];

        expect(final).toMatchObject({
          amount: '990000000000000000',
          feeFromAmount: true,
          params: { borrowAmount: '882000000' },
        });
        expect(final?.recipe.flow).toBe('steps-only');

        expect(result.current.state).toMatchObject({
          kind: 'confirm',
          figures: {
            borrowAmount: 882_000_000n,
            minimumReceived: 98n * 10n ** 16n,
            fee: 10n ** 16n,
            rate: undefined,
          },
        });

        await act(() => result.current.confirm());

        expect(exec().runSteps).toHaveBeenCalledTimes(1);
        expect(vi.mocked(exec().runSteps).mock.calls[0]?.[0]).toMatchObject({
          params: { borrowAmount: '882000000' },
        });
        // The bridge-in was dry-run twice and run once, before the failure.
        expect(exec().preview).toHaveBeenCalledTimes(2);
        expect(exec().run).toHaveBeenCalledTimes(1);
        expect(result.current.state).toEqual({
          kind: 'done',
          executionId: EXECUTION_ID,
        });
      });

      it('re-quotes steps-only on refresh too', async () => {
        const { result } = renderFlow();

        await operationFailed(result, PRICE_FELL());
        await act(() => result.current.refresh());

        expect(exec().previewSteps).toHaveBeenCalledTimes(2);
        expect(exec().preview).toHaveBeenCalledTimes(2);
        expect(result.current.state.kind).toBe('confirm');
      });

      it('stays steps-only after the retry’s signature is rejected', async () => {
        const { result } = renderFlow();

        await operationFailed(result, PRICE_FELL());
        await act(() => result.current.retry());

        vi.mocked(exec().runSteps).mockRejectedValueOnce(EIP1193_REJECTION);
        await act(() => result.current.confirm());

        expect(result.current.state).toMatchObject({ error: 'rejected' });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.fundsWaitingExecutionId).toBe(EXECUTION_ID);

        await act(() => result.current.retry());

        expect(exec().previewSteps).toHaveBeenCalledTimes(4);
        expect(exec().preview).toHaveBeenCalledTimes(2);
        expect(exec().run).toHaveBeenCalledTimes(1);
        expect(result.current.state.kind).toBe('confirm');
      });

      it('only closes when nothing waits at the intermediary any more', async () => {
        const { result } = renderFlow();

        await operationFailed(result, PRICE_FELL());
        vi.mocked(getIntermediaryBalance).mockResolvedValueOnce('0');
        await act(() => result.current.retry());

        expect(exec().previewSteps).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({ error: 'unknown' });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.action).toBe('close');
      });

      it('is unknown when the market explains nothing, and offers only close', async () => {
        const { result } = renderFlow();

        await operationFailed(result, pairSnapshot(FAKE_BASE));

        expect(result.current.state).toMatchObject({ error: 'unknown' });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.action).toBe('close');

        await expectNoNewBridgeIn(result);
      });
    });

    describe('delayed', () => {
      it('warns past the threshold, and close keeps tracking', async () => {
        vi.useFakeTimers();

        const { result } = renderFlow();
        const { run, confirmed } = await confirmHeld(result);

        await emit(
          { type: 'created', executionId: EXECUTION_ID },
          { type: 'phase', phase: 'submitting' },
          { type: 'deposit-sent', txHash: '0xtx' },
        );

        act(() => {
          vi.advanceTimersByTime(BORROW_DELAYED_AFTER_MS);
        });

        expect(result.current.state).toEqual({
          kind: 'error',
          error: 'delayed',
          cause: undefined,
          step: 1,
        });
        expect(result.current.action).toBe('close');

        // Tracking goes on underneath.
        await emit({ type: 'status', status: 'OPERATION_PROCESSING' });
        await act(() => result.current.close());

        expect(result.current.state).toEqual({
          kind: 'pending',
          step: 2,
          executionId: EXECUTION_ID,
          waitingForDeposit: false,
        });

        // Not shown again once closed.
        act(() => {
          vi.advanceTimersByTime(BORROW_DELAYED_AFTER_MS * 2);
        });

        expect(result.current.state.kind).toBe('pending');

        await act(async () => {
          run.resolve(succeeded());
          await confirmed;
        });

        expect(result.current.state.kind).toBe('done');
      });

      it('resumes tracking on close after a poll timeout', async () => {
        const { result } = renderFlow();
        const { run, confirmed } = await confirmHeld(result);

        await emit(
          { type: 'created', executionId: EXECUTION_ID },
          { type: 'phase', phase: 'submitting' },
        );
        exec().hasSubmittedSignature = true;

        await act(async () => {
          run.reject(new ExecutionPollTimeoutError(EXECUTION_ID, 'timed out'));
          await confirmed;
        });

        expect(result.current.state).toMatchObject({ error: 'delayed' });

        const resumed = deferred<Execution>();

        vi.mocked(exec().resume).mockReturnValueOnce(resumed.promise);

        let closing: Promise<void> = Promise.resolve();

        act(() => {
          closing = result.current.close();
        });

        expect(result.current.state).toEqual({
          kind: 'pending',
          step: 0,
          executionId: EXECUTION_ID,
          waitingForDeposit: false,
        });

        await act(async () => {
          resumed.resolve(succeeded());
          await closing;
        });

        expect(exec().resume).toHaveBeenCalledWith(EXECUTION_ID);
        expect(result.current.state).toEqual({
          kind: 'done',
          executionId: EXECUTION_ID,
        });
      });
    });
  });

  describe('recovery', () => {
    it('retries a failed deposit transfer with retryDeposit()', async () => {
      const { result } = renderFlow();
      const run = deferred<Execution>();

      vi.mocked(exec().run).mockReturnValueOnce(run.promise);
      await startFlow(result);

      let confirmed: Promise<void> = Promise.resolve();

      await act(async () => {
        confirmed = result.current.confirm();
        await flushGate();
      });

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
      );
      exec().hasSubmittedSignature = true;

      const failure = new DepositTransferError(EXECUTION_ID, {
        cause: new Error('nonce too low'),
      });

      exec().recovery = {
        kind: 'retry-transfer',
        executionId: EXECUTION_ID,
        cause: new Error('nonce too low'),
      };

      await act(async () => {
        run.reject(failure);
        await confirmed;
      });

      expect(result.current.state).toMatchObject({ error: 'unknown' });

      const retried = deferred<Execution>();

      vi.mocked(exec().retryDeposit).mockReturnValueOnce(retried.promise);

      let retrying: Promise<void> = Promise.resolve();

      await act(async () => {
        retrying = result.current.retry();
        await flushGate();
      });

      // Back to tracking while the transfer is prompted again.
      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 0,
        executionId: EXECUTION_ID,
        waitingForDeposit: false,
      });

      await emit({ type: 'deposit-sent', txHash: '0xtx' });

      expect(result.current.state).toMatchObject({ kind: 'pending', step: 1 });

      await act(async () => {
        retried.resolve(succeeded());
        await retrying;
      });

      expect(exec().retryDeposit).toHaveBeenCalledTimes(1);
      expect(exec().preview).toHaveBeenCalledTimes(2);
      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toEqual({
        kind: 'done',
        executionId: EXECUTION_ID,
      });
    });

    it('previews afresh and runs when nothing was signed, cancelling the unsigned execution first', async () => {
      const { result } = renderFlow();
      const run = deferred<Execution>();

      vi.mocked(exec().run).mockReturnValueOnce(run.promise);
      await startFlow(result);

      let confirmed: Promise<void> = Promise.resolve();

      await act(async () => {
        confirmed = result.current.confirm();
        await flushGate();
      });

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'awaiting-signature' },
      );

      await act(async () => {
        run.reject(new Error('the wallet closed the prompt'));
        await confirmed;
      });

      expect(result.current.state).toMatchObject({ error: 'unknown' });
      // Nothing is cancelled until the next borrow runs.
      expect(exec().cancel).not.toHaveBeenCalled();

      // It still holds the wallet's lock.
      sdk.open = [{ ...dryExecution(), id: EXECUTION_ID, status: 'CREATED' }];
      await act(() => result.current.retry());

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
      expect(exec().retryDeposit).not.toHaveBeenCalled();
      // Two dry runs to confirm, two more for the retry.
      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(2);
      expect(result.current.state.kind).toBe('done');
    });

    it("shows the retry's new dry run, not the confirmed one, when a rejected borrow is retried", async () => {
      const { result } = renderFlow();

      await confirmFailing(result, EIP1193_REJECTION);

      // 0.99 WETH at $3,000 at LTV 50%: the figures the user confirmed.
      expect(result.current.figures?.borrowAmount).toBe(1_485_000_000n);
      expect(result.current.state).toMatchObject({ error: 'rejected' });

      // The retry's quote delivers less collateral: 0.5 WETH.
      vi.mocked(exec().preview).mockImplementation(async (plan) =>
        dryPreview(
          plan,
          dryExecution({
            amountOut: '505000000000000000',
            minAmountOut: '500000000000000000',
          }),
        ),
      );

      const run = deferred<Execution>();

      vi.mocked(exec().run).mockReturnValueOnce(run.promise);

      let retrying: Promise<void> = Promise.resolve();

      await act(async () => {
        retrying = result.current.retry();
        await flushGate();
      });

      // It runs at once, without going back to confirm.
      await vi.waitFor(() => {
        expect(exec().run).toHaveBeenCalledTimes(2);
      });

      expect(result.current.state).toEqual({ kind: 'signing' });
      // 0.5 WETH at $3,000 at LTV 50%.
      expect(result.current.figures?.borrowAmount).toBe(750_000_000n);
      expect(result.current.figures?.minimumReceived).toBe(
        500_000_000_000_000_000n,
      );

      await act(async () => {
        run.resolve(succeeded());
        await retrying;
      });

      expect(result.current.state.kind).toBe('done');
      expect(result.current.figures?.borrowAmount).toBe(750_000_000n);
    });

    it('goes back to confirm, without running, on retry after the gas pre-check failed', async () => {
      const { result } = renderFlow();
      const USDC_ON_BASE = 'nep141:base-0x8335.omft.near';
      const origin = {
        assetId: USDC_ON_BASE,
        chain: 'base',
        decimals: 6,
        contractAddress: '0x8335',
      };

      await act(() =>
        result.current.start(
          input({
            origin,
            fundingRows: [{ assetId: USDC_ON_BASE, amount: 3_000_000_000n }],
          }),
        ),
      );

      expect(result.current.state).toMatchObject({ error: 'noGas' });
      expect(result.current.action).toBe('retry');

      await act(() => result.current.retry());

      // Still short of gas: the same rows are read again.
      expect(result.current.state).toMatchObject({ error: 'noGas' });
      expect(exec().run).not.toHaveBeenCalled();
    });

    it('goes back to confirm, without running, on retry after the dry run failed', async () => {
      const { result } = renderFlow();

      vi.mocked(exec().preview).mockRejectedValueOnce(new Error('offline'));
      await startFlow(result);

      expect(result.current.state).toMatchObject({ error: 'unknown' });
      // Unexplained: the dialog only closes. `retry` still re-quotes.
      expect(result.current.action).toBe('close');

      await act(() => result.current.retry());

      expect(result.current.state.kind).toBe('confirm');
      expect(exec().run).not.toHaveBeenCalled();
    });

    it('starts over from a fresh preview, without resuming, after DEPOSIT_FAILED', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
      );
      exec().hasSubmittedSignature = true;
      await emit({ type: 'status', status: 'DEPOSIT_FAILED' });

      await act(async () => {
        run.reject(new Error('execution DEPOSIT_FAILED'));
        await confirmed;
      });

      expect(result.current.state).toMatchObject({ error: 'unknown' });

      await act(() => result.current.retry());

      expect(exec().resume).not.toHaveBeenCalled();
      expect(exec().cancel).not.toHaveBeenCalled();
      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(1);
      expect(result.current.state.kind).toBe('confirm');
    });

    it('re-quotes and goes back to confirm on refresh', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, new GuardError('QUOTE_MOVED', 'moved'));
      await act(() => result.current.refresh());

      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(1);
      expect(result.current.state.kind).toBe('confirm');
    });

    it('reconnects the wallet, then re-quotes', async () => {
      wallet.connect.mockResolvedValue(undefined);

      const { result, rerender } = renderFlow();

      await confirmFailing(
        result,
        new GuardError('WALLET_NOT_CONNECTED', 'the wallet left'),
      );

      expect(result.current.action).toBe('reconnect');
      // What the page shows: the dialog offers Reconnect, not Close.
      expect(
        borrowDialogStep(result.current.state, result.current.action),
      ).toMatchObject({
        kind: 'error',
        error: 'walletDisconnected',
        action: 'reconnect',
      });

      wallet.isConnected = false;
      rerender();

      act(() => {
        result.current.reconnect();
      });

      expect(wallet.connect).toHaveBeenCalledTimes(1);

      // The wallet is back, with a new runner.
      wallet.isConnected = true;
      sdk.result = {
        ...exec(),
        preview: vi.fn().mockImplementation(previewDry),
      };

      await act(async () => {
        rerender();
      });

      expect(exec().preview).toHaveBeenCalledTimes(2);
      expect(result.current.state.kind).toBe('confirm');
    });

    it('resumes after reconnecting when the wallet only switched accounts and stayed connected', async () => {
      wallet.connect.mockResolvedValue(undefined);

      const { result, rerender } = renderFlow();
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      // An account switch disposes the runner; the wallet stays connected and
      // the new account's runner is already in place before Reconnect.
      await act(async () => {
        run.reject(new RunnerDisposedError(EXECUTION_ID));
        await confirmed;
      });

      const fresh = fakeExecution();

      sdk.result = fresh;
      await act(async () => {
        rerender();
      });

      expect(result.current.action).toBe('reconnect');

      await act(async () => {
        result.current.reconnect();
      });

      expect(fresh.resume).toHaveBeenCalledWith(EXECUTION_ID);
      expect(result.current.state.kind).toBe('done');
    });

    it('re-quotes after reconnecting when the signed deposit was never sent, leaving it for the next borrow', async () => {
      wallet.connect.mockResolvedValue(undefined);

      const { result, rerender } = renderFlow();
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'phase', phase: 'awaiting-deposit' },
      );
      exec().hasSubmittedSignature = true;

      // The wallet left while the deposit transaction was being sent.
      await act(async () => {
        run.reject(new GuardError('WALLET_NOT_CONNECTED', 'the wallet left'));
        await confirmed;
      });

      expect(result.current.action).toBe('reconnect');

      wallet.isConnected = false;
      rerender();

      act(() => {
        result.current.reconnect();
      });

      const fresh = fakeExecution();

      wallet.isConnected = true;
      sdk.result = fresh;

      await act(async () => {
        rerender();
      });

      // Never funded: abandoned, so it is quoted again rather than resumed.
      expect(fresh.resume).not.toHaveBeenCalled();
      expect(fresh.cancel).not.toHaveBeenCalled();
      expect(fresh.preview).toHaveBeenCalled();
      expect(result.current.state.kind).toBe('confirm');
    });

    it('resumes after reconnecting when the deposit was sent', async () => {
      wallet.connect.mockResolvedValue(undefined);

      const { result, rerender } = renderFlow();
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      await act(async () => {
        run.reject(new GuardError('WALLET_NOT_CONNECTED', 'the wallet left'));
        await confirmed;
      });

      wallet.isConnected = false;
      rerender();

      act(() => {
        result.current.reconnect();
      });

      const fresh = fakeExecution();

      wallet.isConnected = true;
      sdk.result = fresh;

      await act(async () => {
        rerender();
      });

      expect(fresh.resume).toHaveBeenCalledWith(EXECUTION_ID);
      expect(fresh.preview).not.toHaveBeenCalled();
      expect(result.current.state.kind).toBe('done');
    });
  });

  describe('a declined signature', () => {
    /** Created, with the wallet prompt for its signature open. */
    const created = async (flow: Flow) => {
      const held = await confirmHeld(flow);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'awaiting-signature' },
      );

      return held;
    };

    it('cancels the created execution at once, saying why, then is rejected', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);
      const cancelled = deferred<void>();

      vi.mocked(exec().cancel).mockReturnValueOnce(cancelled.promise);

      await act(async () => {
        run.reject(EIP1193_REJECTION);
        await flushGate();
      });

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
      expect(result.current.state).toEqual({
        kind: 'cancelling',
        reason: 'declined',
      });

      await act(async () => {
        cancelled.resolve();
        await confirmed;
      });

      expect(result.current.state).toEqual({
        kind: 'error',
        error: 'rejected',
        cause: EIP1193_REJECTION,
        step: 0,
      });
      expect(result.current.action).toBe('retry');
    });

    it('cancels it once, when the runner reports the rejection before run() rejects', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);

      await act(async () => {
        sdk.onEvent?.({ type: 'error', error: userRejection() });
        await flushGate();
        run.reject(userRejection());
        await confirmed;
      });

      expect(exec().cancel).toHaveBeenCalledTimes(1);
      expect(result.current.state).toMatchObject({ error: 'rejected' });
    });

    it('is cancelDeclined when the cancellation is declined too, and asks again on retry', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);

      vi.mocked(exec().cancel).mockRejectedValueOnce(userRejection());

      await act(async () => {
        run.reject(EIP1193_REJECTION);
        await confirmed;
      });

      expect(result.current.state).toMatchObject({
        kind: 'error',
        error: 'cancelDeclined',
        step: 0,
      });
      expect(result.current.action).toBe('retry');

      await act(() => result.current.retry());

      expect(exec().cancel).toHaveBeenCalledTimes(2);
      expect(exec().cancel).toHaveBeenLastCalledWith(EXECUTION_ID);
      expect(result.current.state).toMatchObject({ error: 'rejected' });
      // Asking again for the cancellation never runs a new borrow.
      expect(exec().run).toHaveBeenCalledTimes(1);
    });

    it('runs a fresh borrow on retry, with nothing left to cancel', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);

      await act(async () => {
        run.reject(EIP1193_REJECTION);
        await confirmed;
      });

      await act(() => result.current.retry());

      expect(exec().cancel).toHaveBeenCalledTimes(1);
      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(2);
      expect(result.current.state.kind).toBe('done');
    });

    it('is rejected, with nothing to cancel, when no execution was created', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, EIP1193_REJECTION);

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({ error: 'rejected' });
    });

    it('is depositRejected, without cancelling, when the deposit is declined after signing', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);

      await emit(
        { type: 'phase', phase: 'submitting' },
        { type: 'phase', phase: 'awaiting-deposit' },
      );

      await act(async () => {
        run.reject(
          new DepositTransferError(EXECUTION_ID, { cause: userRejection() }),
        );
        await confirmed;
      });

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({
        error: 'depositRejected',
        step: 0,
      });
      expect(result.current.action).toBe('retry');
    });
  });

  describe('the wallet lock, when a borrow is confirmed', () => {
    const OTHER_ID = 'exec-0';

    /** An open execution of the wallet, as `listExecutions` lists it. */
    const open = (
      status: Execution['status'],
      messageSigned: boolean,
    ): Execution => {
      const base = dryExecution();

      return {
        ...base,
        id: OTHER_ID,
        status,
        details: { ...base.details, messageSigned },
      };
    };

    const confirmWith = async (flow: Flow, blocking: Execution) => {
      sdk.open = [blocking];
      await startFlow(flow);
      await act(() => flow.current.confirm());
    };

    it('runs at once when nothing is open', async () => {
      const { result } = renderFlow();

      await startFlow(result);
      await act(() => result.current.confirm());

      expect(sdk.listExecutions).toHaveBeenCalledWith(
        WALLET_A,
        expect.objectContaining({ status: expect.any(Array) }),
      );
      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state.kind).toBe('done');
    });

    it('cancels an unsigned one, whatever its status reads, saying why, then runs', async () => {
      const { result } = renderFlow();
      const cancelled = deferred<void>();

      vi.mocked(exec().cancel).mockReturnValueOnce(cancelled.promise);
      sdk.open = [open('DEPOSIT_PENDING', false)];
      await startFlow(result);

      let confirmed: Promise<void> = Promise.resolve();

      await act(async () => {
        confirmed = result.current.confirm();
        await flushGate();
      });

      expect(exec().cancel).toHaveBeenCalledWith(OTHER_ID);
      expect(exec().run).not.toHaveBeenCalled();
      expect(result.current.state).toEqual({
        kind: 'cancelling',
        reason: 'previous',
      });

      await act(async () => {
        cancelled.resolve();
        await confirmed;
      });

      expect(exec().run).toHaveBeenCalledTimes(1);
      expect(result.current.state.kind).toBe('done');
    });

    it('cancels a signed one this session saw never funded, then runs', async () => {
      const { result } = renderFlow();

      markCreated(WALLET_A, OTHER_ID);
      await confirmWith(result, open('DEPOSIT_PENDING', true));

      expect(exec().cancel).toHaveBeenCalledWith(OTHER_ID);
      expect(exec().run).toHaveBeenCalledTimes(1);
    });

    it('waits for one whose deposit this session saw sent', async () => {
      const { result } = renderFlow();

      markDepositSent(WALLET_A, OTHER_ID);
      await confirmWith(result, open('DEPOSIT_PENDING', true));

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(exec().run).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({
        kind: 'error',
        error: 'busy',
      });
      expect(result.current.action).toBe('close');
    });

    it('waits for a signed one this session knows nothing of (a reload)', async () => {
      const { result } = renderFlow();

      await confirmWith(result, open('DEPOSIT_PENDING', true));

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({ error: 'busy' });
    });

    it('waits for one whose deposit was seen', async () => {
      const { result } = renderFlow();

      await confirmWith(result, open('DEPOSIT_PROCESSING', false));

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({ error: 'busy' });
    });

    it('shows the previous borrow on its way when Borrow is clicked, instead of quoting', async () => {
      const onPrevious = vi.fn();
      const { result } = renderFlow({ onPrevious });
      const previous = open('DEPOSIT_PROCESSING', true);

      vi.mocked(exec().resume).mockReturnValueOnce(
        deferred<Execution>().promise,
      );
      sdk.open = [previous];
      await startFlow(result);

      expect(onPrevious).toHaveBeenCalledWith(previous);
      expect(exec().preview).not.toHaveBeenCalled();
      expect(exec().resume).toHaveBeenCalledWith(OTHER_ID);
      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 1,
        executionId: OTHER_ID,
        waitingForDeposit: false,
      });
    });

    it('shows the previous borrow when it is found only at Confirm', async () => {
      const onPrevious = vi.fn();
      const { result } = renderFlow({ onPrevious });

      vi.mocked(exec().resume).mockReturnValueOnce(
        deferred<Execution>().promise,
      );
      await startFlow(result);

      // It started in another tab meanwhile.
      sdk.open = [open('OPERATION_PENDING', true)];
      await act(() => result.current.confirm());

      expect(onPrevious).toHaveBeenCalledTimes(1);
      expect(exec().run).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({
        kind: 'pending',
        step: 2,
        executionId: OTHER_ID,
      });
    });

    it('follows the runner it still drives, rather than resuming it again', async () => {
      const onPrevious = vi.fn();
      const { result } = renderFlow({ onPrevious });

      // The dialog was closed while this runner kept watching it.
      exec().isBusy = true;
      exec().executionId = OTHER_ID;
      sdk.open = [open('DEPOSIT_PROCESSING', true)];
      await startFlow(result);

      expect(exec().resume).not.toHaveBeenCalled();

      await emit({ type: 'status', status: 'SUCCESS' });

      expect(result.current.state).toEqual({
        kind: 'done',
        executionId: OTHER_ID,
      });
    });

    it('shows the failure of a previous borrow it follows on its still-busy runner', async () => {
      const onPrevious = vi.fn();
      const { result } = renderFlow({ onPrevious });
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: OTHER_ID },
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      // Left while the runner keeps driving it, then Borrow is clicked again.
      await act(() => result.current.leave());
      exec().isBusy = true;
      exec().executionId = OTHER_ID;
      sdk.open = [open('DEPOSIT_PROCESSING', true)];
      await startFlow(result);

      expect(onPrevious).toHaveBeenCalledTimes(1);
      expect(exec().resume).not.toHaveBeenCalled();
      expect(result.current.state.kind).toBe('pending');

      await act(async () => {
        run.reject(new Error('execution DEPOSIT_FAILED'));
        await confirmed;
      });

      expect(result.current.state).toMatchObject({ kind: 'error' });
    });

    it('still shows a restored borrow as the previous one after its dialog was closed', async () => {
      const onPrevious = vi.fn();
      const { result } = renderFlow({ onPrevious });
      const restored = open('DEPOSIT_PENDING', true);

      vi.mocked(exec().resume).mockReturnValue(deferred<Execution>().promise);

      // Restored after a reload; the runner surfaces its deposit address.
      act(() => {
        result.current.restore(restored);
      });
      await emit(
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-address', address: '0xdeposit', memo: null },
      );
      await act(() => result.current.leave());

      // Borrow again while it is still DEPOSIT_PENDING.
      sdk.open = [restored];
      await startFlow(result);

      expect(onPrevious).toHaveBeenCalledWith(restored);
      expect(exec().preview).not.toHaveBeenCalled();
      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({
        kind: 'pending',
        executionId: OTHER_ID,
      });
    });

    it('asks again for a declined cancellation, then runs the borrow quoted afresh', async () => {
      const { result } = renderFlow();

      vi.mocked(exec().cancel).mockRejectedValueOnce(userRejection());
      await confirmWith(result, open('CREATED', false));

      expect(result.current.state).toMatchObject({ error: 'cancelDeclined' });
      expect(exec().run).not.toHaveBeenCalled();

      sdk.open = [];
      await act(() => result.current.retry());

      expect(exec().cancel).toHaveBeenCalledTimes(2);
      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(1);
      expect(result.current.state.kind).toBe('done');
    });

    it('remembers a deposit it sent, so the next borrow waits for it', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await confirmHeld(result);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'submitting' },
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-sent', txHash: '0xtx' },
      );

      await act(async () => {
        run.reject(new ExecutionPollTimeoutError(EXECUTION_ID, 'timed out'));
        await confirmed;
      });
      await act(() => result.current.leave());

      sdk.open = [{ ...open('DEPOSIT_PENDING', true), id: EXECUTION_ID }];
      await startFlow(result);
      await act(() => result.current.confirm());

      expect(exec().cancel).not.toHaveBeenCalled();
      expect(result.current.state).toMatchObject({ error: 'busy' });
    });
  });

  describe('restoring', () => {
    /** An in-flight execution found after a reload. */
    const found = (
      status: Execution['status'],
      messageSigned = true,
    ): Execution => {
      const base = dryExecution();

      return {
        ...base,
        id: EXECUTION_ID,
        status,
        quote: { ...base.quote, depositAddress: '0xdeposit' },
        details: { ...base.details, messageSigned },
      };
    };

    it('waits for the deposit of a signed DEPOSIT_PENDING borrow, without prompting the wallet', async () => {
      const { result } = renderFlow();
      const resumed = deferred<Execution>();

      vi.mocked(exec().resume).mockReturnValueOnce(resumed.promise);

      act(() => {
        result.current.restore(found('DEPOSIT_PENDING'));
      });

      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 0,
        executionId: EXECUTION_ID,
        waitingForDeposit: true,
      });
      // A plain resume: never `depositViaWallet`, so nothing is prompted.
      expect(exec().resume).toHaveBeenCalledWith(EXECUTION_ID);

      // The runner surfaces the address while it watches: still waiting.
      await emit(
        { type: 'phase', phase: 'awaiting-deposit' },
        { type: 'deposit-address', address: '0xdeposit', memo: null },
      );

      expect(result.current.state).toMatchObject({
        step: 0,
        waitingForDeposit: true,
      });

      await emit({ type: 'status', status: 'DEPOSIT_PROCESSING' });

      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 1,
        executionId: EXECUTION_ID,
        waitingForDeposit: false,
      });

      await act(async () => {
        resumed.resolve(succeeded());
      });

      expect(result.current.state.kind).toBe('done');
    });

    it('shows a borrow whose deposit this session saw sent past the deposit step', async () => {
      const { result } = renderFlow();

      markDepositSent(WALLET_A, EXECUTION_ID);
      vi.mocked(exec().resume).mockReturnValueOnce(
        deferred<Execution>().promise,
      );

      act(() => {
        result.current.restore(found('DEPOSIT_PENDING'));
      });

      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 1,
        executionId: EXECUTION_ID,
        waitingForDeposit: false,
      });
    });

    it('shows a borrow past the deposit at its step', async () => {
      const { result } = renderFlow();

      vi.mocked(exec().resume).mockReturnValueOnce(
        deferred<Execution>().promise,
      );

      act(() => {
        result.current.restore(found('OPERATION_PENDING'));
      });

      expect(result.current.state).toMatchObject({
        kind: 'pending',
        step: 2,
        waitingForDeposit: false,
      });
    });

    it('never quotes or runs an earlier form input for a restored borrow', async () => {
      const { result } = renderFlow();

      // Another wallet's borrow was previewed, then cancelled.
      await startFlow(result);
      await act(() => result.current.leave());

      vi.mocked(exec().resume).mockRejectedValueOnce(new Error('offline'));
      await act(async () => {
        result.current.restore(found('DEPOSIT_PENDING'));
      });

      expect(result.current.state).toMatchObject({ error: 'unknown' });

      await act(() => result.current.refresh());

      // Only the two dry runs of the earlier start.
      expect(exec().preview).toHaveBeenCalledTimes(2);
      expect(exec().run).not.toHaveBeenCalled();
      expect(result.current.state).toEqual({ kind: 'idle' });
    });
  });

  describe('leaving', () => {
    it('never prompts the wallet for an unsigned execution, on leave or unmount', async () => {
      const { result, unmount } = renderFlow();

      await confirmHeld(result);
      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'awaiting-signature' },
      );
      await act(() => result.current.leave());
      unmount();

      expect(exec().cancel).not.toHaveBeenCalled();
    });

    it('closes the confirm dialog back to idle', async () => {
      const { result } = renderFlow();

      await startFlow(result);
      await act(() => result.current.close());

      expect(result.current.state).toEqual({ kind: 'idle' });
      expect(exec().cancel).not.toHaveBeenCalled();
    });

    it("forgets the dry run's figures", async () => {
      const { result } = renderFlow();

      await startFlow(result);

      expect(result.current.figures?.borrowAmount).toBe(1_485_000_000n);

      await act(() => result.current.leave());

      expect(result.current.figures).toBeUndefined();
    });
  });
});
