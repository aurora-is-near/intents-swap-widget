import {
  DepositTransferError,
  type Execution,
  type ExecutionPlan,
  ExecutionPollTimeoutError,
  GuardError,
  type RunnerEvent,
} from '@aurora-is-near/intents-connect';
import type {
  UseExecutionOptions,
  UseExecutionResult,
} from '@aurora-is-near/intents-connect/react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dryExecution, dryPreview } from '../../tests/executionFixtures';
import {
  createFakeAdapter,
  FAKE_BASE,
  pairSnapshot,
  USD,
  usdc,
  weth,
} from '../../tests/fakeMarkets';
import { BORROW_DELAYED_AFTER_MS } from './classifyBorrowError';
import type { BorrowParams } from './recipe';
import { type BorrowFlowInput, useBorrowFlow } from './useBorrowFlow';

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
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../../tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('@aurora-is-near/intents-connect/react', () => ({
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

/** A promise to settle from the test. */
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

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
  previewSteps: vi.fn(),
  runSteps: vi.fn(),
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

  act(() => {
    confirmed = flow.current.confirm();
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

beforeEach(() => {
  sdk.result = fakeExecution();
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

    it('is priceMoved when the quote moved, and offers a refresh', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, new GuardError('QUOTE_MOVED', 'moved'));

      expect(result.current.state).toMatchObject({ error: 'priceMoved' });
      expect(result.current.action).toBe('refresh');
    });

    it('is unknown for anything else', async () => {
      const { result } = renderFlow();

      await confirmFailing(result, new Error('boom'));

      expect(result.current.state).toMatchObject({ error: 'unknown' });
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

        act(() => {
          confirmed = flow.current.confirm();
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

      it('is priceMoved when the market, read afresh, blames the price, and offers only close', async () => {
        const { result } = renderFlow();

        // WETH fell to $1,800: the loan is above the max LTV now.
        await operationFailed(
          result,
          pairSnapshot(FAKE_BASE, {
            collateral: [weth({ priceBase: 1_800n * USD })],
          }),
        );

        expect(result.current.state).toMatchObject({ error: 'priceMoved' });
        expect(result.current.fundsWaiting).toBe(true);
        expect(result.current.action).toBe('close');

        await expectNoNewBridgeIn(result);
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
        });
        expect(result.current.action).toBe('close');

        // Tracking goes on underneath.
        await emit({ type: 'status', status: 'OPERATION_PROCESSING' });
        await act(() => result.current.close());

        expect(result.current.state).toEqual({
          kind: 'pending',
          step: 2,
          executionId: EXECUTION_ID,
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

      act(() => {
        confirmed = result.current.confirm();
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

      act(() => {
        retrying = result.current.retry();
      });

      // Back to tracking while the transfer is prompted again.
      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 0,
        executionId: EXECUTION_ID,
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

    it('previews afresh and runs when nothing was signed, releasing the unsigned execution', async () => {
      const { result } = renderFlow();
      const run = deferred<Execution>();

      vi.mocked(exec().run).mockReturnValueOnce(run.promise);
      await startFlow(result);

      let confirmed: Promise<void> = Promise.resolve();

      act(() => {
        confirmed = result.current.confirm();
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

      await act(() => result.current.retry());

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
      expect(exec().retryDeposit).not.toHaveBeenCalled();
      // Two dry runs to confirm, two more for the retry.
      expect(exec().preview).toHaveBeenCalledTimes(4);
      expect(exec().run).toHaveBeenCalledTimes(2);
      expect(result.current.state.kind).toBe('done');
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
      expect(result.current.action).toBe('retry');

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

    it('does not cancel an execution the runner already cancelled', async () => {
      const { result } = renderFlow();

      vi.mocked(exec().run).mockImplementationOnce(async () => {
        sdk.onEvent?.({ type: 'created', executionId: EXECUTION_ID });
        exec().phase = 'cancelled';
        throw EIP1193_REJECTION;
      });
      await startFlow(result);
      await act(() => result.current.confirm());

      expect(result.current.state).toMatchObject({ error: 'rejected' });

      await act(() => result.current.retry());

      expect(exec().cancel).not.toHaveBeenCalled();
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

    it('resumes a signed execution after reconnecting, without cancelling it', async () => {
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

      // The wallet is back, with a new runner that knows nothing of it.
      const resumed = deferred<Execution>();
      const fresh = fakeExecution();

      vi.mocked(fresh.resume).mockReturnValueOnce(resumed.promise);
      wallet.isConnected = true;
      sdk.result = fresh;

      await act(async () => {
        rerender();
      });

      expect(fresh.resume).toHaveBeenCalledWith(EXECUTION_ID);
      expect(fresh.preview).not.toHaveBeenCalled();
      expect(fresh.cancel).not.toHaveBeenCalled();
      expect(result.current.state).toEqual({
        kind: 'pending',
        step: 0,
        executionId: EXECUTION_ID,
      });

      await act(async () => {
        resumed.resolve(succeeded());
      });

      expect(result.current.state).toEqual({
        kind: 'done',
        executionId: EXECUTION_ID,
      });
    });
  });

  describe('leaving', () => {
    /** Created, with the wallet prompt open. */
    const created = async (flow: Flow) => {
      const held = await confirmHeld(flow);

      await emit(
        { type: 'created', executionId: EXECUTION_ID },
        { type: 'phase', phase: 'awaiting-signature' },
      );

      return held;
    };

    it('cancels a created, unsigned execution to release the wallet lock', async () => {
      const { result } = renderFlow();

      await created(result);
      await act(() => result.current.leave());

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
      expect(result.current.state).toEqual({ kind: 'idle' });
    });

    it('cancels it when submitting the signature failed', async () => {
      const { result } = renderFlow();
      const { run, confirmed } = await created(result);

      // The runner enters `submitting` before the submit call, which fails:
      // the execution stays CREATED and unsigned.
      await emit({ type: 'phase', phase: 'submitting' });

      expect(result.current.state).toEqual({ kind: 'signing' });

      await act(async () => {
        run.reject(new Error('network error'));
        await confirmed;
      });

      expect(exec().hasSubmittedSignature).toBe(false);
      expect(result.current.state).toMatchObject({ error: 'unknown' });

      await act(() => result.current.leave());

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
    });

    it('cancels it when the hook unmounts', async () => {
      const { result, unmount } = renderFlow();

      await created(result);
      unmount();

      expect(exec().cancel).toHaveBeenCalledWith(EXECUTION_ID);
    });

    it('leaves a signed execution alone', async () => {
      const { result, unmount } = renderFlow();

      await created(result);
      exec().hasSubmittedSignature = true;
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
  });
});
