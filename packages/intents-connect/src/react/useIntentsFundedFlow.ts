import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';

import { getWalletIntentsAccountId } from '@/account';
import { IntentsConnectError, toError } from '@/errors';
import {
  type FundIntermediaryOptions,
  quoteFunding,
  resumeFunding,
  signAndSubmitFunding,
  watchFunding,
} from '@/funding/fundIntermediary';
import { getIntermediaryBalance } from '@/funding/intermediaryBalance';
import { getActiveFunding } from '@/funding/store';
import type {
  FundingEvent,
  FundingPhase,
  FundingRecord,
  FundingRequest,
} from '@/funding/types';
import type { SwapQuoteResponse } from '@/intentsApi/types';
import { proofRpcUrls } from '@/near/rpcUrls';
import type { StepsPlan } from '@/runner/types';
import { IN_FLIGHT_STATUSES } from '@/types/execution';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';
import type { UseExecutionResult } from '@/react/useExecution';

/**
 * - `ready-to-transfer`: quoted, transfer not signed (declined, or found
 *   after a reload) — `retryTransfer()` while the quote lives.
 * - `ready-to-supply`: the funds wait at the intermediary — `supply()`.
 */
export type FundedFlowStage =
  | 'idle'
  | 'quoting'
  | 'ready-to-transfer'
  | 'awaiting-transfer-signature'
  | 'submitting-transfer'
  | 'bridging'
  | 'awaiting-arrival'
  | 'ready-to-supply'
  | 'supplying'
  | 'success'
  | 'refunded'
  | 'failed';

export type UseIntentsFundedFlowOptions<TArgs, TParams> = {
  /**
   * The page's execution runner (`useExecution`, or `useIntentsConnectFlow`'s
   * `exec`): the steps that spend the funds run on it, so its resume and
   * cancel UI covers them too.
   */
  exec: UseExecutionResult;
  /** What to move to the intermediary, from the integrator's own input. */
  buildFunding: (args: TArgs) => FundingRequest | Promise<FundingRequest>;
  /** The steps-only plan that spends `amount` at the intermediary. */
  buildStepsPlan: (input: {
    /** Smallest unit of the destination token. */
    amount: string;
    /** The funding request's `context`. */
    context?: Record<string, unknown>;
    record?: FundingRecord;
  }) => StepsPlan<TParams>;
  /** Throw to stop before the transfer prompt (e.g. too small after fees). */
  confirmQuote?: FundIntermediaryOptions['confirmQuote'];
  /**
   * Prompt the spending steps as soon as the funds arrive, in the session
   * that signed the transfer. Defaults to `true`. After a reload the flow
   * stops at `ready-to-supply` instead.
   */
  autoContinue?: boolean;
  onEvent?: (event: FundingEvent) => void;
};

export type UseIntentsFundedFlowResult<TArgs> = {
  stage: FundedFlowStage;
  exec: UseExecutionResult;
  /** The funding this flow follows, if any. */
  record?: FundingRecord;
  quote?: SwapQuoteResponse;
  error?: Error;
  /** A leg in progress, or the runner busy. */
  isBusy: boolean;
  /** Quotes, signs the transfer, waits for the funds, then spends them. */
  submit: (args: TArgs) => Promise<void>;
  /**
   * Spends what waits at the intermediary: the funding's arrived funds (the
   * intermediary's current balance), or `amount` with no funding — e.g.
   * funds stranded by an earlier session. Resumes a spend in progress.
   */
  supply: (options?: {
    amount?: string;
    context?: Record<string, unknown>;
  }) => Promise<void>;
  /** Signs the transfer of a `ready-to-transfer` funding. */
  retryTransfer: () => Promise<void>;
  /** Forgets the current funding (a quote not signed is abandoned). */
  dismiss: () => Promise<void>;
};

const SUPPLY_TERMINAL_OK = 'SUCCESS';

/**
 * A deposit funded from intents (or confidential) balances, in two legs: a
 * 1Click transfer to the wallet's Intents Connect intermediary, then a
 * steps-only execution that spends what arrived. Survives reloads: a signed
 * transfer is followed to the end without prompting again.
 */
export const useIntentsFundedFlow = <TArgs, TParams = unknown>(
  options: UseIntentsFundedFlowOptions<TArgs, TParams>,
): UseIntentsFundedFlowResult<TArgs> => {
  const account = useIntentsAccountContext();
  const connect = useIntentsConnect();
  const intentsAccountId = getWalletIntentsAccountId(connect.wallet);
  const fundingSnapshot = useSnapshot(account.funding.state);

  const [recordId, setRecordId] = useState<string>();
  const [phase, setPhase] = useState<FundingPhase>();
  const [quote, setQuote] = useState<SwapQuoteResponse>();
  const [error, setError] = useState<Error>();
  const [running, setRunning] = useState(false);
  const [supplying, setSupplying] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Refs, not state: a double click lands before React re-renders.
  const busy = useRef(false);
  const abort = useRef<AbortController>(undefined);
  const latest = useRef({ options, account, connect });

  latest.current = { options, account, connect };

  const liveRecord = (id = recordId): FundingRecord | undefined => {
    const { account: current, connect: live } = latest.current;
    const accountId = getWalletIntentsAccountId(live.wallet);

    return id && accountId
      ? current.funding.state.records[accountId]?.find(
          (candidate) => candidate.id === id,
        )
      : undefined;
  };

  const fundingOptions = (): FundIntermediaryOptions => {
    const { account: current, connect: live, options: opts } = latest.current;
    const { wallet } = live;

    if (!wallet) {
      throw new IntentsConnectError('no wallet connected');
    }

    const { session } = current;
    const authorized =
      session.state.status === 'authorized' &&
      session.state.intentsAccountId === getWalletIntentsAccountId(wallet);

    return {
      intentsApi: current.intentsApi,
      connectApi: live.api,
      wallet,
      store: current.funding,
      withAccessToken: authorized ? session.withAccessToken : undefined,
      rpcs: current.config.current.rpcs,
      nearRpc: { rpcUrls: proofRpcUrls(current.intentsApi) },
      signal: abort.current?.signal,
      confirmQuote: opts.confirmQuote,
      onEvent: (event) => {
        if (event.type === 'phase') {
          setPhase(event.phase);
        }

        if (event.type === 'quoted') {
          setQuote(event.quote);
        }

        latest.current.options.onEvent?.(event);
      },
    };
  };

  /** Leg B: the steps that spend the funds at the intermediary. */
  const spend = async (
    record: FundingRecord | undefined,
    { amount, context }: { amount?: string; context?: Record<string, unknown> },
  ) => {
    const { options: opts } = latest.current;
    const fundingOpts = fundingOptions();
    const { store } = fundingOpts;

    // A spend already created (found after a reload): follow it.
    if (record?.stage === 'supplying' && record.stepsExecutionId) {
      setSupplying(true);

      try {
        const execution = await opts.exec.resume(record.stepsExecutionId);

        await store.put({
          ...record,
          stage: execution.status === SUPPLY_TERMINAL_OK ? 'done' : 'arrived',
          updatedAt: Date.now(),
        });
        setSucceeded(execution.status === SUPPLY_TERMINAL_OK);
      } finally {
        setSupplying(false);
      }

      return;
    }

    let spendable = amount;

    if (!spendable) {
      if (!record) {
        throw new IntentsConnectError('nothing to supply: pass an amount');
      }

      // The full balance: clamps to what landed and sweeps earlier dust.
      spendable = await getIntermediaryBalance({
        intermediary: { evm: record.recipient },
        destination: record.destination,
        rpcs: fundingOpts.rpcs,
      });
    }

    if (BigInt(spendable) <= 0n) {
      throw new IntentsConnectError('nothing waits at the intermediary');
    }

    const plan = opts.buildStepsPlan({
      amount: spendable,
      context: context ?? record?.context,
      record,
    });

    let current = record;

    if (current) {
      current = { ...current, stage: 'supplying', updatedAt: Date.now() };
      await store.put(current);
    }

    setSupplying(true);

    try {
      const execution = await opts.exec.runSteps(plan);
      const done = execution.status === SUPPLY_TERMINAL_OK;

      if (current) {
        await store.put({
          ...current,
          stage: done ? 'done' : 'arrived',
          stepsExecutionId: execution.id,
          updatedAt: Date.now(),
        });
      }

      setSucceeded(done);
    } catch (spendError) {
      // Declined or failed: the funds stay at the intermediary.
      if (current) {
        await store.put({
          ...current,
          stage: 'arrived',
          stepsExecutionId: latest.current.options.exec.executionId,
          updatedAt: Date.now(),
        });
      }

      throw spendError;
    } finally {
      setSupplying(false);
    }
  };

  /** Leg A from a quoted record: sign, watch, then (optionally) spend. */
  const transferAndSpend = async (quoted: FundingRecord) => {
    const fundingOpts = fundingOptions();
    let current = await signAndSubmitFunding(quoted, fundingOpts);

    current = await watchFunding(current, fundingOpts);
    setRunning(false);
    setPhase(undefined);

    if (latest.current.options.autoContinue !== false) {
      await spend(current, {});
    }
  };

  const guarded = (task: () => Promise<void>) => async () => {
    if (busy.current) {
      return;
    }

    busy.current = true;
    setError(undefined);

    try {
      await task();
    } catch (taskError) {
      setError(toError(taskError));
    } finally {
      busy.current = false;
      setRunning(false);
      setPhase(undefined);
    }
  };

  const submit = useCallback(
    (args: TArgs) =>
      guarded(async () => {
        setSucceeded(false);
        setQuote(undefined);
        setRecordId(undefined);
        setRunning(true);

        const request = await latest.current.options.buildFunding(args);
        const quoted = await quoteFunding(request, fundingOptions());

        setRecordId(quoted.id);
        await transferAndSpend(quoted);
      })(),
    [],
  );

  const retryTransfer = useCallback(
    () =>
      guarded(async () => {
        const quoted = liveRecord();

        if (quoted?.stage !== 'quoted') {
          return;
        }

        setRunning(true);
        await transferAndSpend(quoted);
      })(),
    [recordId],
  );

  const supply = useCallback(
    (
      supplyOptions: {
        amount?: string;
        context?: Record<string, unknown>;
      } = {},
    ) =>
      guarded(async () => {
        const record = liveRecord();

        setSucceeded(false);
        await spend(
          record && ['arrived', 'supplying'].includes(record.stage)
            ? record
            : undefined,
          supplyOptions,
        );
      })(),
    [recordId],
  );

  const dismiss = useCallback(async () => {
    const record = liveRecord();
    const { funding } = latest.current.account;

    if (record) {
      await (record.stage === 'quoted'
        ? funding.put({ ...record, stage: 'abandoned', updatedAt: Date.now() })
        : funding.remove(record.intentsAccountId, record.id));
    }

    setRecordId(undefined);
    setQuote(undefined);
    setError(undefined);
    setSucceeded(false);
  }, [recordId]);

  // Keep the spending execution's id while it runs, so a reload finds it.
  const { executionId } = options.exec;

  useEffect(() => {
    const record = liveRecord();

    if (
      supplying &&
      record?.stage === 'supplying' &&
      executionId &&
      record.stepsExecutionId !== executionId
    ) {
      void latest.current.account.funding.put({
        ...record,
        stepsExecutionId: executionId,
        updatedAt: Date.now(),
      });
    }
  }, [supplying, executionId, recordId]);

  // On mount and account change: pick up a funding still in progress.
  // Never prompts — a transfer already submitted is only watched.
  useEffect(() => {
    if (!intentsAccountId) {
      return undefined;
    }

    const controller = new AbortController();
    let live = true;

    abort.current = controller;
    setRecordId(undefined);

    void (async () => {
      const { account: current, connect: liveConnect } = latest.current;
      const active = getActiveFunding(
        await current.funding.load(intentsAccountId),
      );

      if (!live || !active) {
        return;
      }

      setRecordId(active.id);

      if (active.stage === 'supplying') {
        const address = liveConnect.wallet?.getAddress();
        const [execution] =
          active.stepsExecutionId && address
            ? await liveConnect.api
                .listExecutions(address, { id: active.stepsExecutionId })
                .catch(() => [])
            : [];

        if (execution && IN_FLIGHT_STATUSES.includes(execution.status)) {
          return;
        }

        await current.funding.put({
          ...active,
          stage: execution?.status === SUPPLY_TERMINAL_OK ? 'done' : 'arrived',
          updatedAt: Date.now(),
        });

        return;
      }

      if (
        !['submitting', 'submitted', 'settled', 'quoted'].includes(active.stage)
      ) {
        return;
      }

      const watching = active.stage !== 'quoted';

      if (watching) {
        busy.current = true;
        setRunning(true);
      }

      try {
        await resumeFunding(active, {
          ...fundingOptions(),
          signal: controller.signal,
        });
      } catch (resumeError) {
        if (live && !controller.signal.aborted) {
          setError(toError(resumeError));
        }
      } finally {
        if (watching && live) {
          busy.current = false;
          setRunning(false);
          setPhase(undefined);
        }
      }
    })();

    return () => {
      live = false;
      controller.abort(new Error('the funded flow unmounted'));
    };
  }, [account.funding, intentsAccountId]);

  const record = (
    recordId && intentsAccountId
      ? fundingSnapshot.records[intentsAccountId]?.find(
          (candidate) => candidate.id === recordId,
        )
      : undefined
  ) as FundingRecord | undefined;

  const stage = ((): FundedFlowStage => {
    if (supplying) {
      return 'supplying';
    }

    if (succeeded) {
      return 'success';
    }

    if (!record) {
      return running ? 'quoting' : 'idle';
    }

    switch (record.stage) {
      case 'quoted':
        if (!running) {
          return 'ready-to-transfer';
        }

        return phase === 'awaiting-signature'
          ? 'awaiting-transfer-signature'
          : 'quoting';

      case 'submitting':
        return running && phase === 'submitting'
          ? 'submitting-transfer'
          : 'bridging';

      case 'submitted':
        return 'bridging';

      case 'settled':
        return 'awaiting-arrival';

      case 'arrived':
        return 'ready-to-supply';

      case 'supplying':
        return 'supplying';

      case 'done':
        return 'success';

      case 'refunded':
        return 'refunded';

      default:
        return 'failed';
    }
  })();

  return {
    stage,
    exec: options.exec,
    record,
    quote,
    error,
    isBusy: running || supplying || options.exec.isBusy,
    submit,
    supply,
    retryTransfer,
    dismiss,
  };
};
