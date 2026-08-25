import { EVM_CHAIN_IDS, getChainFamily, parseOriginAsset } from '@/chains';
import {
  DepositTransferError,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  failGuard,
  GuardError,
  IntentsConnectApiError,
  isUserRejection,
  RunnerDisposedError,
  toError,
} from '@/errors';
import { defaultLogger } from '@/logger';
import { createExecutionMachine, moveTo } from '@/machine/machine';
import * as guards from '@/machine/guards';
import type { Context } from '@/machine/context';
import { isTerminalPhase, type Phase } from '@/machine/phases';
import {
  signIntentsConnectPayload,
  signIntentsConnectText,
} from '@/signers/intentsConnect';
import {
  BACKEND_PLACEHOLDERS,
  type Execution,
  type FeeStrategy,
  IN_FLIGHT_STATUSES,
  type Intermediary,
  type Step,
  type SwapType,
  TERMINAL_STATUSES,
} from '@/types/execution';
import {
  isSupportedSigningStandard,
  type SignatureEnvelope,
  type SigningStandard,
} from '@/types/signing';
import type { MakeTransferArgs, TransferResult } from '@/types/transfer';
import type { WalletConnector } from '@/types/wallet';
import type { CreateExecutionBody } from '@/api/types';
import type {
  ExecutionPlan,
  ExecutionRunner,
  ExecutionRunnerOptions,
  OriginToken,
  ResumeDepositOptions,
  RunnerEvent,
} from '@/runner/types';

const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 240;
const DEFAULT_FEE_STRATEGY: FeeStrategy = { kind: 'placeholder' };
/** Applied when the caller supplies no `quote.deadline` — the API requires one. */
const DEFAULT_QUOTE_DEADLINE_MS = 10 * 60_000;
/**
 * How long past `quote.deadline` the deposit wait keeps polling before the
 * regular attempt budget takes over — covers clock skew and a deposit sent at
 * the last second that the watcher has not observed yet.
 */
const DEPOSIT_DEADLINE_GRACE_MS = 5 * 60_000;
/**
 * Transient poll failures tolerated in a row. A single network blip must not
 * report a live execution as failed; a persistently unreachable API must.
 */
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

/**
 * The subset of an `ExecutionPlan` the deposit leg actually consumes. `run()`
 * retains its full plan (a structural superset), while `resume()` can rebuild
 * one of these from the execution alone — which is what lets a reloaded page
 * still drive the wallet transfer instead of only showing the address.
 */
type DepositPlan = {
  originChain: string;
  originToken: OriginToken;
  originChainId?: number | null;
  depositViaWallet: boolean;
  quote: { swapType: SwapType; deadline?: string };
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const createExecutionRunner = (
  options: ExecutionRunnerOptions,
): ExecutionRunner => {
  const {
    api,
    wallet,
    plugins,
    pluginOptions,
    makeTransfer: makeTransferOverride,
    autoCancelOnSignatureRejection = true,
    logger = defaultLogger,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
    onEvent,
  } = options;

  const machine = createExecutionMachine();

  // Resolved per use rather than captured once, so an accessor always yields the
  // current connector and optional members (`makeTransfer`, `decodePublicKey`)
  // are detected on the live object rather than a stale snapshot.
  const getWallet = (): WalletConnector =>
    typeof wallet === 'function' ? wallet() : wallet;

  /** Set by `cancel()`; observed at every wallet-interaction boundary and by the polling loop. */
  let cancelledExecutionId: string | undefined;

  /**
   * Set by `dispose()`. A disposed runner must stop touching the wallet and
   * the API: its owner has been rebound (typically to another account), so any
   * further side effect would act on behalf of the wrong context.
   */
  let disposed = false;

  /** The deposit leg of the current run, kept so `retryDeposit()` can replay the transfer. */
  let activePlan: DepositPlan | undefined;

  /**
   * The id of the execution `activePlan` was created FOR. `resume()` needs it
   * to tell a same-session resume (safe to replay the plan's transfer) from a
   * cross-session one that merely reuses a runner still holding an unrelated
   * plan — context.executionId cannot be used for that, because resume patches
   * it to the resumed id before the check.
   */
  let activePlanExecutionId: string | undefined;

  const emit = (event: RunnerEvent) => onEvent?.(event);

  const patch = (values: Partial<Context>) => {
    Object.assign(machine.context, values);
  };

  const to = (phase: Phase) =>
    moveTo(machine, phase, {
      logger,
      onMoved: (moved) => emit({ type: 'phase', phase: moved }),
    });

  const throwIfDisposed = () => {
    if (disposed) {
      throw new RunnerDisposedError(machine.context.executionId);
    }
  };

  const throwIfCancelled = (executionId: string) => {
    if (cancelledExecutionId === executionId) {
      throw new ExecutionCancelledError(executionId);
    }
  };

  /**
   * Refuses re-entry while an execution is being driven, then clears the
   * previous run's machine state. Without the reset, a retry after a terminal
   * phase would run invisibly (terminal phases have no outgoing transitions)
   * against stale context — e.g. a `bakedAmount` from a previous threeRound
   * run spuriously tripping the QUOTE_MOVED guard.
   */
  const prepareForNewFlow = () => {
    throwIfDisposed();

    if (machine.current !== 'idle' && !isTerminalPhase(machine.current)) {
      failGuard(
        'EXECUTION_IN_FLIGHT',
        `this runner is already driving an execution (phase: ${machine.current}) — wait for it, cancel() it, or use another runner`,
      );
    }

    machine.reset();
    cancelledExecutionId = undefined;
  };

  const requireAddress = (): string => {
    const address = getWallet().getAddress();

    if (!address) {
      return failGuard('WALLET_NOT_CONNECTED', 'no wallet is connected');
    }

    return address;
  };

  /**
   * Returns the standard alongside the envelope. The caller has to validate the
   * envelope against the standard it was actually signed with — which comes from
   * the execution, not from what the connector claims to be.
   */
  const signPayload = async (
    execution: Execution,
  ): Promise<{ envelope: SignatureEnvelope; standard: SigningStandard }> => {
    const { payload, standard } = guards.mustHaveSigningPayload(execution);
    const activeWallet = getWallet();

    const envelope = await signIntentsConnectPayload({
      payload,
      standard,
      address: requireAddress(),
      providers: activeWallet.getProviders(),
      decodePublicKey: activeWallet.decodePublicKey,
    });

    return { envelope, standard };
  };

  /* ── 1. Identity ─────────────────────────────────────────────────────────
   * Deterministic and stable per wallet, so it is fetched once per run and
   * everything downstream acts "on behalf of" the intermediary. */
  const resolveIdentity = async () => {
    to('resolving-identity');

    const intermediary = await api.getIntermediary(requireAddress(), {
      publicKey: getWallet().getPublicKey?.(),
    });

    patch({ intermediary });

    return intermediary;
  };

  /**
   * The intermediary account the steps execute against is per execution TYPE:
   * solana steps need the solana account (ATA derivation requires a concrete
   * base58 address), and it may legitimately be null when the feature is off.
   */
  const pickIntermediaryAddress = <TParams>(
    plan: ExecutionPlan<TParams>,
    intermediary: Intermediary,
  ): string => {
    const address =
      plan.recipe.type === 'solana' ? intermediary.solana : intermediary.evm;

    if (!address) {
      return failGuard(
        'NO_INTERMEDIARY',
        `the service returned no ${plan.recipe.type} intermediary account for this wallet`,
      );
    }

    return address;
  };

  /** The API requires `quote.deadline`; default it rather than 400. */
  const withQuoteDeadline = <TParams>(
    plan: ExecutionPlan<TParams>,
  ): ExecutionPlan<TParams> =>
    plan.quote.deadline
      ? plan
      : {
          ...plan,
          quote: {
            ...plan.quote,
            deadline: new Date(
              Date.now() + DEFAULT_QUOTE_DEADLINE_MS,
            ).toISOString(),
          },
        };

  const buildBody = <TParams>(
    plan: ExecutionPlan<TParams>,
    steps: Step[],
    dry: boolean,
  ): CreateExecutionBody => ({
    version: '1.0',
    type: plan.recipe.type,
    quote: plan.quote,
    steps,
    metadata: { title: plan.recipe.title, intent: plan.recipe.intent },
    dry,
    publicKey:
      plan.originChain === 'ton' ? getWallet().getPublicKey?.() : undefined,
  });

  const validateSteps = <TParams>(
    plan: ExecutionPlan<TParams>,
    steps: Step[],
  ): Step[] => {
    guards.stepShapeIsLegal(steps, plan.recipe.type);
    guards.destinationTokenIsTouched(
      steps,
      plan.recipe.destination.tokenAddress,
    );

    return steps;
  };

  /* ── 2. Plan ─────────────────────────────────────────────────────────────
   * Sizes the spendable amount against the fee the service carves.
   *
   * The circularity: the amount depends on the fee, the fee depends on the
   * steps, the steps depend on the amount. Two ways out. */
  const planSteps = async <TParams>(
    plan: ExecutionPlan<TParams>,
    intermediaryAddress: string,
  ): Promise<Step[]> => {
    to('planning');

    const { recipe, params, quote } = plan;
    const feeStrategy = plan.feeStrategy ?? DEFAULT_FEE_STRATEGY;

    guards.recipientOnlyOnOutOperation(recipe.flow, quote.recipient);
    await guards.originNetworkMatches(
      getWallet().getChainId,
      plan.originChainId,
    );

    const base = {
      intermediary: intermediaryAddress,
      userAddress: requireAddress(),
    };

    // Strategy A — one round. The service substitutes the post-fee amount.
    if (feeStrategy.kind === 'placeholder') {
      const steps = recipe.buildSteps(
        { ...base, amount: BACKEND_PLACEHOLDERS.minAmountOut },
        params,
      );

      guards.strategiesAreExclusive(feeStrategy, steps);

      if (!guards.stepsUsePlaceholder(steps)) {
        logger.warn(
          `recipe "${recipe.id}" ignored ctx.amount under the placeholder fee strategy, so the service has no amount to substitute — intended only if its amounts are deliberately fixed`,
        );
      }

      return validateSteps(plan, steps);
    }

    // Strategy B — three rounds, so an exact figure can be shown pre-signature.
    // Round 1 is step-less: gas estimation only runs with non-empty steps, so
    // this is what yields an un-carved quote.
    guards.round1MustBeStepless([]);

    const gross = await api.createExecution(
      requireAddress(),
      buildBody(plan, [], true),
    );

    // Round 2 — real steps at the gross amount, which measures the fee.
    const probe = recipe.buildSteps(
      { ...base, amount: gross.quote.minAmountOut },
      params,
    );

    guards.strategiesAreExclusive(feeStrategy, probe);

    const measured = await api.createExecution(
      requireAddress(),
      buildBody(plan, validateSteps(plan, probe), true),
    );

    const networkFee = guards.feeMustBeEstimated(measured);

    guards.amountMustExceedFee(gross.quote.minAmountOut, networkFee);

    // Already post-fee — do NOT subtract again.
    const spendable = measured.quote.minAmountOut;

    patch({ networkFee, spendable, bakedAmount: spendable });
    emit({ type: 'quoted', networkFee, spendable });

    // Round 3 steps, rebuilt at the carved amount. The invariant now holds:
    //   spendable + networkFee === the bridge's guaranteed delivery
    const final = recipe.buildSteps({ ...base, amount: spendable }, params);

    return validateSteps(plan, final);
  };

  /* ── 3. Create ─────────────────────────────────────────────────────────── */
  const create = async <TParams>(
    plan: ExecutionPlan<TParams>,
    steps: Step[],
  ): Promise<Execution> => {
    to('creating');

    guards.stepsRequiredForRealCreate(steps, false);

    const address = requireAddress();

    // Pre-empt the 409 in-flight lock with an actionable local error. Every
    // status the service still holds the lock for has to be queried, not just
    // CREATED — a deposited-but-unsettled execution holds it too.
    guards.noExecutionInFlight(
      await api.listExecutions(address, { status: IN_FLIGHT_STATUSES }),
    );

    let execution: Execution;

    try {
      execution = await api.createExecution(
        address,
        buildBody(plan, steps, false),
      );
    } catch (error) {
      if (
        error instanceof IntentsConnectApiError &&
        error.isExecutionInFlight
      ) {
        return failGuard('EXECUTION_IN_FLIGHT', error.message);
      }

      throw error;
    }

    // Recorded BEFORE the post-create guards: the execution now exists
    // server-side and holds the in-flight lock, so if a guard below throws,
    // the id must already be in context for `cancel()` to clear it.
    patch({
      execution,
      executionId: execution.id,
      status: execution.status,
      networkFee: execution.details.networkFee ?? machine.context.networkFee,
    });

    emit({ type: 'created', executionId: execution.id });

    try {
      const { bakedAmount } = machine.context;

      if (bakedAmount) {
        guards.quoteMustNotHaveMoved(bakedAmount, execution.quote.minAmountOut);
      }

      guards.mustHaveSigningPayload(execution);
    } catch (error) {
      if (error instanceof GuardError) {
        throw new GuardError(
          error.code,
          `${error.message} — execution ${execution.id} was created and holds the in-flight lock; cancel('${execution.id}') clears it`,
        );
      }

      throw error;
    }

    return execution;
  };

  /* ── 4/5. Sign, then submit ──────────────────────────────────────────────
   * Deliberately before the deposit: the service holds the pre-signed batch and
   * fires it the moment the bridge settles.
   *
   * Returns whether a user deposit is still required. */
  const signAndSubmit = async (execution: Execution): Promise<boolean> => {
    to('awaiting-signature');

    const { envelope, standard } = await signPayload(execution);

    // The wallet prompt can sit open across a cancel() or a dispose(); a
    // signature approved after either must not be submitted.
    throwIfCancelled(execution.id);
    throwIfDisposed();

    // Checked against the execution's standard, not the connector's: the
    // envelope was produced from the former, and a disagreement between the two
    // is itself the fault to report rather than a publicKey mismatch.
    guards.publicKeyMatchesStandard(standard, envelope.publicKey);

    to('submitting');

    const { status } = await api.submitSignature(requireAddress(), {
      ...envelope,
      executionId: execution.id,
    });

    patch({ hasSubmittedSignature: true });

    // Out-operations answer SIGNING — already OPERATION_PENDING, nothing to
    // deposit. v1 only creates bridge-ins, but the branch is real.
    return status !== 'SIGNING';
  };

  const resolveTransfer = (
    originChain: string,
  ): ((args: MakeTransferArgs) => Promise<Pick<TransferResult, 'hash'>>) => {
    if (makeTransferOverride) {
      return (args) => makeTransferOverride(args, undefined as void);
    }

    const activeWallet = getWallet();
    const walletTransfer = activeWallet.makeTransfer;

    if (walletTransfer) {
      // Invoked through the connector so a class-based implementation keeps
      // its `this`.
      return (args) => walletTransfer.call(activeWallet, args);
    }

    const family = getChainFamily(originChain);
    const plugin = family ? plugins?.[family] : undefined;

    if (!family || !plugin) {
      // Thrown at resolution rather than invocation: a missing implementation
      // is a configuration error, not a retryable transfer failure.
      return failGuard(
        'NO_TRANSFER_IMPLEMENTATION',
        `no transfer implementation for origin chain "${originChain}" — pass a wallet connector with makeTransfer, a plugin, or makeTransfer directly`,
      );
    }

    // Each plugin family expects a DIFFERENT options shape, so a multi-chain
    // integration namespaces them by family ({ evm: {…}, sol: {…}, … }) and
    // each plugin receives only its slice. A flat object (single-family
    // setups) passes through unchanged.
    const familyOptions =
      pluginOptions &&
      typeof pluginOptions === 'object' &&
      family in pluginOptions
        ? (pluginOptions as Record<string, unknown>)[family]
        : pluginOptions;

    return (args) => plugin.makeTransfer(args, familyOptions);
  };

  /* ── 6. Deposit ──────────────────────────────────────────────────────────
   * The only place a deposit address is exposed, and only post-signature. */
  const exposeDepositAddress = (execution: Execution, deadline?: string) => {
    to('awaiting-deposit');

    guards.mustBeSignedBeforeDeposit(machine.context.hasSubmittedSignature);

    const { depositAddress, depositMemo } = execution.quote;
    const validUntil = deadline ?? execution.quote.deadline;

    patch({ depositAddress, depositMemo, deadline: validUntil });

    emit({
      type: 'deposit-address',
      address: depositAddress,
      memo: depositMemo,
      deadline: validUntil,
    });

    return { depositAddress, depositMemo };
  };

  const awaitDeposit = async (plan: DepositPlan, execution: Execution) => {
    guards.memoPresentForStellar(plan.originChain, execution.quote.depositMemo);

    const { depositAddress, depositMemo } = exposeDepositAddress(
      execution,
      plan.quote.deadline,
    );

    // QR / exchange path: the sender is not our wallet, so there is no tx hash
    // to record. The backend's deposit watcher observes settlement instead.
    if (!plan.depositViaWallet) {
      return;
    }

    // A cancel() or dispose() that landed while the earlier stages ran must
    // stop the flow BEFORE the wallet is asked to move funds.
    throwIfCancelled(execution.id);
    throwIfDisposed();

    // EXACT_INPUT sends quote.amount verbatim; EXACT_OUTPUT sends the service's
    // computed origin commitment. Never recompute it.
    const amountAtomic =
      plan.quote.swapType === 'EXACT_OUTPUT'
        ? execution.quote.amountIn
        : execution.quote.amount;

    const transfer = resolveTransfer(plan.originChain);

    let hash: string;

    try {
      ({ hash } = await transfer({
        amountAtomic,
        decimals: plan.originToken.decimals,
        address: depositAddress,
        tokenAddress: plan.originToken.contractAddress,
        chain: plan.originChain,
        evmChainId: plan.originChainId ?? null,
        isNativeEvmTokenTransfer: !plan.originToken.contractAddress,
        memo: depositMemo ?? undefined,
      }));
    } catch (error) {
      // A rejected wallet prompt is the single most common event at this
      // stage, and the execution is still valid and signed server-side — so
      // this is a retryable pause (`retryDeposit()`), not a terminal failure.
      throw new DepositTransferError(execution.id, { cause: toError(error) });
    }

    patch({ depositTxHash: hash });
    emit({ type: 'deposit-sent', txHash: hash });

    // Best-effort: notifies 1Click without waiting for the watcher.
    try {
      await api.recordDeposit({
        txHash: hash,
        depositAddress,
        ...(depositMemo ? { memo: depositMemo } : {}),
      });
    } catch (error) {
      logger.warn('failed to record the deposit (non-fatal)', error);
    }
  };

  /* ── 7. Settle ───────────────────────────────────────────────────────────
   * The API answers with an array even for a single id.
   *
   * `no-await-in-loop` is disabled deliberately: polling is inherently
   * sequential. Each round must observe the result of the previous sleep, so
   * parallelising the requests would just hammer the API. */
  const settle = async (executionId: string): Promise<Execution> => {
    // The QR / exchange path stays in `awaiting-deposit` until the watcher
    // observes funds — the UI's deposit screen keys off that phase, and the
    // user may take minutes to move funds. Every other entry settles at once.
    const holdingForDeposit = () =>
      machine.current === 'awaiting-deposit' &&
      machine.context.status === 'CREATED' &&
      !machine.context.depositTxHash;

    if (!holdingForDeposit()) {
      to('settling');
    }

    // Captured once. Re-reading it per iteration would turn a wallet disconnect
    // during a multi-minute settle into a reported failure for an execution that
    // is completing successfully on-chain.
    const address = requireAddress();

    const deadlineMs = machine.context.deadline
      ? Date.parse(machine.context.deadline)
      : Number.NaN;

    let attempt = 0;
    let consecutiveErrors = 0;

    while (attempt < maxPollAttempts) {
      throwIfDisposed();
      throwIfCancelled(executionId);

      let execution: Execution | undefined;

      try {
        // eslint-disable-next-line no-await-in-loop
        [execution] = await api.listExecutions(address, { id: executionId });
        consecutiveErrors = 0;
      } catch (error) {
        // One transient failure must not report a live execution as failed;
        // only a persistently unreachable API escalates.
        consecutiveErrors += 1;

        if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
          throw error;
        }

        logger.warn(
          `poll for execution ${executionId} failed (${consecutiveErrors}/${MAX_CONSECUTIVE_POLL_ERRORS} consecutive) — retrying`,
          error,
        );
      }

      if (execution) {
        // Patch and emit only on change: every React consumer re-renders per
        // event, and settling can span hundreds of identical polls.
        if (execution.status !== machine.context.status) {
          patch({ execution, status: execution.status });
          emit({ type: 'status', status: execution.status });
        }

        if (TERMINAL_STATUSES.includes(execution.status)) {
          // A terminal status can arrive while the phase sits at `expired` or
          // `awaiting-deposit`, neither of which has a direct edge to `success`.
          if (
            machine.current === 'expired' ||
            machine.current === 'awaiting-deposit'
          ) {
            to('settling');
          }

          if (execution.status === 'SUCCESS') {
            to('success');

            return execution;
          }

          to('failed');

          throw new Error(`execution ${execution.status}`);
        }

        // EXPIRED is soft-terminal: reflect it in the phase and keep polling,
        // because a late deposit revives the execution. Held rather than flipped
        // back each iteration, so the phase mirrors the observed state instead of
        // emitting two events per poll.
        if (execution.status === 'EXPIRED') {
          to('expired');
        } else if (machine.current === 'expired') {
          to('settling');
        } else if (
          machine.current === 'awaiting-deposit' &&
          execution.status !== 'CREATED'
        ) {
          // The watcher observed the deposit — the waiting-for-funds hold ends.
          to('settling');
        }
      }

      // While waiting on user funds, the clock is the quote deadline, not the
      // poll budget: burning the attempts while the user is still moving funds
      // through an exchange would declare a live execution failed.
      const withinDepositWindow =
        holdingForDeposit() &&
        Number.isFinite(deadlineMs) &&
        Date.now() < deadlineMs + DEPOSIT_DEADLINE_GRACE_MS;

      if (!withinDepositWindow) {
        attempt += 1;
      }

      if (attempt < maxPollAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(pollIntervalMs);
      }
    }

    const expired = machine.current === 'expired';

    to('failed');

    // Typed, and explicit that this is NOT a verdict: the execution is still
    // live server-side and `resume()` reattaches to it.
    throw new ExecutionPollTimeoutError(
      executionId,
      expired
        ? `execution ${executionId} expired and was not revived within ${maxPollAttempts} polls`
        : `polling timed out after ${maxPollAttempts} attempts for execution ${executionId}`,
    );
  };

  /** Shared failure handling: record it, announce it, then rethrow. */
  const fail = (error: unknown): never => {
    const failure = toError(error);

    patch({ error: failure });
    emit({ type: 'error', error: failure });

    // A rejected deposit transfer is retryable — the execution is still valid
    // and signed, so the machine stays in `awaiting-deposit` for
    // `retryDeposit()`. A cancellation already moved the machine to
    // `cancelled`. Anything else is a failure, including one raised before any
    // phase progress.
    const retryable = failure instanceof DepositTransferError;

    if (
      !retryable &&
      machine.current !== 'cancelled' &&
      machine.current !== 'failed'
    ) {
      to('failed');
    }

    throw failure;
  };

  const cancel = async (executionId?: string) => {
    const id = executionId ?? machine.context.executionId;

    if (!id) {
      throw new Error('no execution to cancel');
    }

    const activeWallet = getWallet();

    // Flagged before the wallet is touched and cleared in the `finally` below,
    // so a UI can label the prompt it is about to show — the phase alone
    // cannot say it, since cancelling interrupts whatever phase was current.
    patch({ isCancelling: true });

    try {
      const envelope = await signIntentsConnectText({
        text: `delete_execution:${id}`,
        standard: activeWallet.signingStandard,
        address: requireAddress(),
        providers: activeWallet.getProviders(),
        decodePublicKey: activeWallet.decodePublicKey,
      });

      // Flagged BEFORE the delete round-trip so any concurrent stage — the poll
      // loop, a pending signature submit, a pending transfer — stops at its next
      // checkpoint. Rolled back if the delete fails, so a live run is not halted
      // for an execution that still exists.
      const previous = cancelledExecutionId;

      cancelledExecutionId = id;

      try {
        await api.deleteExecution(requireAddress(), id, envelope);
      } catch (error) {
        cancelledExecutionId = previous;

        throw error;
      }

      // The cancelled execution's plan must not survive it: a later resume()
      // matching on a recycled id would otherwise replay a transfer for an
      // execution that no longer exists.
      if (activePlanExecutionId === id) {
        activePlan = undefined;
        activePlanExecutionId = undefined;
      }

      // Nothing that DESCRIBES the deleted execution may outlive it. A UI keys
      // its recovery actions off `error` and renders `status` / `networkFee` /
      // the deposit address, all of which now refer to something that no longer
      // exists server-side — a cancelled execution reporting `status: CREATED`
      // is simply false. `executionId` stays, so a UI can still name what was
      // cancelled, as does `intermediary`, which is per wallet rather than per
      // execution. Only needed on the legal-transition path; the reset below
      // clears everything on the terminal-phase path.
      patch({
        error: undefined,
        execution: undefined,
        status: undefined,
        networkFee: undefined,
        spendable: undefined,
        bakedAmount: undefined,
        depositAddress: undefined,
        depositMemo: undefined,
        deadline: undefined,
        depositTxHash: undefined,
        hasSubmittedSignature: false,
      });

      // `to` refuses the move when the machine sits in a terminal phase — the
      // common case being `failed` after the EXECUTION_IN_FLIGHT guard, where
      // the execution being cancelled blocks a run this runner never started.
      // The delete succeeded either way, so the stale terminal state (and the
      // guard error a UI keys its recovery controls on) must not outlive it:
      // reset to a clean idle so the next run starts unblocked.
      if (!to('cancelled')) {
        machine.reset();
        emit({ type: 'phase', phase: 'idle' });
      }
    } finally {
      patch({ isCancelling: false });
    }
  };

  const run = async <TParams>(
    inputPlan: ExecutionPlan<TParams>,
  ): Promise<Execution> => {
    prepareForNewFlow();

    try {
      // The connector's standard must be signable BEFORE anything is created:
      // a real create for a standard we cannot sign (ton_connect, tip191)
      // would strand an execution holding the in-flight lock.
      const { signingStandard } = getWallet();

      if (!isSupportedSigningStandard(signingStandard)) {
        failGuard(
          'UNSUPPORTED_SIGNING_STANDARD',
          `this package cannot sign ${String(signingStandard)} yet — refusing to create an execution it could never complete`,
        );
      }

      const plan = withQuoteDeadline(inputPlan);

      const intermediary = await resolveIdentity();
      const steps = await planSteps(
        plan,
        pickIntermediaryAddress(plan, intermediary),
      );

      const execution = await create(plan, steps);

      // Retained only once an execution exists to bind it to. Assigning any
      // earlier would let a run() that dies in the guards — most commonly the
      // in-flight preflight, on a second click while a previous execution is
      // still open — clobber the plan that resume() needs to replay THAT
      // previous execution's deposit.
      activePlan = plan;
      activePlanExecutionId = execution.id;

      let needsDeposit: boolean;

      try {
        needsDeposit = await signAndSubmit(execution);
      } catch (error) {
        // A rejected signing prompt means the user abandoned THIS attempt —
        // but the created execution still holds the per-wallet in-flight
        // lock. Best effort: offer the delete signature right away so the
        // next run() starts clean instead of tripping EXECUTION_IN_FLIGHT
        // and demanding a resume-or-cancel decision. Declining that second
        // prompt (or any delete failure) falls back to the normal recovery,
        // with the ORIGINAL rejection as the recorded error either way.
        if (autoCancelOnSignatureRejection && isUserRejection(error)) {
          try {
            await cancel(execution.id);
          } catch (cancelError) {
            logger.warn(
              'auto-cancel after a rejected signature failed — the execution still holds the in-flight lock',
              cancelError,
            );
          }
        }

        throw error;
      }

      if (needsDeposit) {
        await awaitDeposit(plan, execution);
      }

      return await settle(execution.id);
    } catch (error) {
      return fail(error);
    }
  };

  /**
   * Retries the deposit transfer after the wallet prompt was rejected or
   * failed (`DepositTransferError`). The execution is still valid and signed
   * server-side; nothing before the transfer is repeated.
   */
  const retryDeposit = async (): Promise<Execution> => {
    const { execution } = machine.context;

    if (!activePlan || !execution) {
      throw new Error(
        'nothing to retry — retryDeposit() applies only after run() stopped at the deposit transfer',
      );
    }

    if (machine.current !== 'awaiting-deposit') {
      throw new Error(
        `retryDeposit() requires the awaiting-deposit phase (current: ${machine.current})`,
      );
    }

    // The failure being retried is superseded the moment the user retries —
    // a UI keys its error line and recovery controls off `context.error`, and
    // keeping it makes a running retry look still-failed. run() and resume()
    // get this for free from prepareForNewFlow(); retry keeps the machine
    // state by design, so the error is cleared explicitly.
    patch({ error: undefined });

    try {
      await awaitDeposit(activePlan, execution);

      return await settle(execution.id);
    } catch (error) {
      return fail(error);
    }
  };

  /**
   * Whether `resolveTransfer` would find an implementation for this chain —
   * checked WITHOUT the guard throw, so `resume()` can fall back to surfacing
   * the deposit address instead of failing a resumable execution.
   */
  const hasTransferImplementation = (originChain: string): boolean => {
    if (makeTransferOverride !== undefined) {
      return true;
    }

    if (getWallet().makeTransfer !== undefined) {
      return true;
    }

    const family = getChainFamily(originChain);

    return Boolean(family && plugins?.[family]);
  };

  /**
   * Rebuilds the deposit leg from the execution alone, for a resume with no
   * retained plan. `quote.originAsset` decodes to the chain and token address,
   * the amounts already live on the execution, and for EVM the chain id comes
   * from the built-in registry (EVM transfers move `amountAtomic` and never
   * consult `decimals`). Every other family formats with the token's decimals,
   * so those require `options.originToken` — `undefined` here means "cannot
   * rebuild safely", and the caller surfaces the address instead.
   */
  const buildResumeDepositPlan = (
    execution: Execution,
    depositOptions?: ResumeDepositOptions,
  ): DepositPlan | undefined => {
    if (depositOptions?.depositViaWallet === false) {
      return undefined;
    }

    const { originAsset } = execution.quote;
    const origin = originAsset ? parseOriginAsset(originAsset) : undefined;

    if (!origin) {
      return undefined;
    }

    const family = getChainFamily(origin.chain);

    if (!family) {
      return undefined;
    }

    const decimals = depositOptions?.originToken?.decimals;

    if (family !== 'evm' && decimals === undefined) {
      return undefined;
    }

    const originChainId =
      depositOptions?.originChainId ??
      (family === 'evm' ? (EVM_CHAIN_IDS[origin.chain] ?? null) : null);

    if (family === 'evm' && originChainId === null) {
      return undefined;
    }

    return {
      originChain: origin.chain,
      originToken: {
        contractAddress:
          depositOptions?.originToken?.contractAddress ?? origin.tokenAddress,
        decimals: decimals ?? 0,
      },
      originChainId,
      depositViaWallet: true,
      quote: {
        swapType: execution.quote.swapType ?? 'EXACT_INPUT',
        deadline: execution.quote.deadline,
      },
    };
  };

  /**
   * Reattaches to an execution from an earlier session.
   *
   * Picks up from wherever it actually got rather than assuming it is already
   * settling: an execution that was signed but never funded still needs its
   * deposit address surfaced, and one that was never signed can still be signed.
   */
  const resume = async (
    executionId: string,
    depositOptions?: ResumeDepositOptions,
  ): Promise<Execution> => {
    prepareForNewFlow();

    try {
      const [execution] = await api.listExecutions(requireAddress(), {
        id: executionId,
      });

      if (!execution) {
        throw new Error(`no execution found for id ${executionId}`);
      }

      const { messageSigned, payload } = execution.details;

      // Sign whenever a payload is still offered and nothing says it was
      // signed. `messageSigned` alone is not trustworthy in the other
      // direction: it is optional on the wire, and inferring "signed" from a
      // non-CREATED status mislabels a deposit that was detected before the
      // signature.
      const needsSigning = messageSigned !== true && Boolean(payload);

      // An unsigned CREATED execution with no payload can never progress —
      // name that instead of polling it to a timeout.
      if (
        execution.status === 'CREATED' &&
        messageSigned !== true &&
        !payload
      ) {
        guards.mustHaveSigningPayload(execution);
      }

      patch({
        execution,
        executionId: execution.id,
        status: execution.status,
        hasSubmittedSignature: !needsSigning,
      });

      // CREATED is still waiting on funds; DEPOSIT_PENDING is SIGNED and
      // still waiting on funds (the /submit response names the same state
      // SIGNED_PENDING_DEPOSIT) — the single most common resume case, since a
      // failed transfer leg strands an execution exactly there; EXPIRED may be
      // revived by a late deposit — the package's own design — which requires
      // re-surfacing the address, or the user has no means to effect the
      // revival. From DEPOSIT_PROCESSING onward the funds have been observed,
      // so prompting another transfer would double-spend.
      let needsDeposit =
        execution.status === 'CREATED' ||
        execution.status === 'DEPOSIT_PENDING' ||
        execution.status === 'EXPIRED';

      if (needsSigning) {
        needsDeposit = await signAndSubmit(execution);
      }

      if (needsDeposit && execution.quote.depositAddress) {
        // Same-session resume: this runner created the execution and still
        // holds its plan, so the wallet deposit itself can be replayed — the
        // recovery path for "rejected the signature, trying again".
        const isOwnRun = !!activePlan && activePlanExecutionId === execution.id;

        let plan: DepositPlan | undefined;

        if (isOwnRun && activePlan) {
          plan = activePlan;
        } else {
          // Cross-session resume: the plan is gone (page reload), but the
          // deposit leg can usually be rebuilt from the execution itself.
          const rebuilt = buildResumeDepositPlan(execution, depositOptions);

          if (rebuilt && hasTransferImplementation(rebuilt.originChain)) {
            plan = rebuilt;
          }
        }

        if (plan) {
          // Retained so a failed transfer stays retryable via retryDeposit().
          activePlan = plan;
          activePlanExecutionId = execution.id;

          await awaitDeposit(plan, execution);
        } else {
          // resume() has no plan to read the origin chain from, but a sep53
          // connector IS a Stellar origin — and a Stellar deposit without a
          // memo is unattributable on the shared deposit address.
          if (getWallet().signingStandard === 'sep53') {
            guards.memoPresentForStellar(
              'stellar',
              execution.quote.depositMemo,
            );
          }

          exposeDepositAddress(execution);
        }
      }

      return await settle(execution.id);
    } catch (error) {
      return fail(error);
    }
  };

  return {
    run,
    resume,
    retryDeposit,
    cancel,
    dispose: () => {
      disposed = true;
    },
    getPhase: () => machine.current,
    getStore: () => machine.getStore(),
  };
};
