import { getWalletIntentsAccountId } from '@/account';
import type { IntentsConnectApi } from '@/api/types';
import type { ChainRpcUrls } from '@/balances/types';
import { isEvmChain } from '@/chains';
import { failGuard, IntentsApiError, toError } from '@/errors';
import { FundingError } from '@/funding/errors';
import { getIntermediaryBalance } from '@/funding/intermediaryBalance';
import {
  assertPreparedIntent,
  requireSignableStandard,
  signPreparedIntent,
} from '@/funding/preparedIntent';
import { buildFundingQuoteRequest } from '@/funding/quoteRequest';
import type { FundingStore } from '@/funding/store';
import { getActiveFunding } from '@/funding/store';
import {
  FUNDING_RAIL,
  type FundingEvent,
  type FundingPhase,
  type FundingRecord,
  type FundingRequest,
} from '@/funding/types';
import type {
  IntentsApi,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapStatusResult,
  UserTokenOptions,
} from '@/intentsApi/types';
import type { NearRpcOptions } from '@/near/rpc';
import { IN_FLIGHT_STATUSES } from '@/types/execution';
import type { WalletConnector } from '@/types/wallet';

export type FundIntermediaryOptions = {
  intentsApi: Pick<
    IntentsApi,
    'getQuote' | 'generateIntent' | 'submitIntent' | 'getSwapStatus'
  >;
  connectApi: Pick<IntentsConnectApi, 'getIntermediary' | 'listExecutions'>;
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders' | 'getPublicKey'
  >;
  store: FundingStore;
  /**
   * Required for confidential funding: runs a call with the user's session
   * token (`IntentsSession.withAccessToken`).
   */
  withAccessToken?: <T>(
    call: (accessToken: string) => Promise<T>,
  ) => Promise<T>;
  /** Destination-chain RPCs for the intermediary balance. */
  rpcs?: ChainRpcUrls;
  /** NEAR RPC for `intents.near` key checks (named accounts). */
  nearRpc?: NearRpcOptions;
  /** Stops polling. The record survives and can be resumed. */
  signal?: AbortSignal;
  /** Milliseconds between status polls. Defaults to 3000, 10 000 after a minute. */
  pollIntervalMs?: number;
  /** Gives up watching after this long (resumable). Defaults to 30 min. */
  statusTimeoutMs?: number;
  /** How long to wait for the funds at the intermediary. Defaults to 5 min. */
  arrivalTimeoutMs?: number;
  /** Throw to stop before the wallet prompt, e.g. when the quote is too small. */
  confirmQuote?: (quote: SwapQuoteResponse) => void | Promise<void>;
  onEvent?: (event: FundingEvent) => void;
  /** For tests. */
  now?: () => number;
};

const SLOW_POLL_MS = 10_000;
const SLOW_POLL_AFTER_MS = 60_000;
/** A fresh deposit address may be unknown to 1Click for a little while. */
const NOT_FOUND_GRACE_MS = 60_000;
const MAX_POLL_ERRORS = 5;
/** Margin before `timeWhenInactive` within which a transfer is not signed. */
const QUOTE_MARGIN_MS = 60_000;
/** After the deadline a never-funded quote is considered abandoned. */
const ABANDON_AFTER_MS = 5 * 60_000;

/** Fundings being signed (`sign:`) or watched (`watch:`) in this page. */
const running = new Map<
  string,
  { promise: Promise<FundingRecord>; signal?: AbortSignal }
>();

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('aborted'));

      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error('aborted'));
      },
      { once: true },
    );
  });

const expiryOf = (record: FundingRecord) =>
  Date.parse(record.quote.timeWhenInactive ?? record.quote.deadline ?? '') ||
  undefined;

const createContext = (options: FundIntermediaryOptions) => {
  const { store, onEvent, now = Date.now } = options;

  const emit = (event: FundingEvent) => onEvent?.(event);
  const phase = (value: FundingPhase) => emit({ type: 'phase', phase: value });

  const save = async (
    record: FundingRecord,
    patch: Partial<FundingRecord>,
  ): Promise<FundingRecord> => {
    const next = { ...record, ...patch, updatedAt: now() };

    await store.put(next);
    emit({ type: 'record', record: next });

    return next;
  };

  /** Calls the intents API, with the session token on the confidential rail. */
  const call = <T>(
    source: FundingRecord['source'],
    fn: (options: UserTokenOptions) => Promise<T>,
  ): Promise<T> => {
    if (source !== 'confidential') {
      return fn({});
    }

    if (!options.withAccessToken) {
      throw new FundingError(
        'NOT_AUTHORIZED',
        'confidential funding needs an authorized user session',
      );
    }

    return options.withAccessToken((accessToken) => fn({ accessToken }));
  };

  return { ...options, now, emit, phase, save, call };
};

type Context = ReturnType<typeof createContext>;

const requireAccount = (ctx: Context) => {
  const walletAddress = ctx.wallet.getAddress();
  const intentsAccountId = getWalletIntentsAccountId(ctx.wallet);

  if (!walletAddress || !intentsAccountId) {
    throw new FundingError(
      'WALLET_NOT_CONNECTED',
      'the wallet has not shared an address',
    );
  }

  return { walletAddress, intentsAccountId };
};

const readBalance = (
  ctx: Context,
  record: Pick<FundingRecord, 'recipient' | 'destination'>,
) =>
  getIntermediaryBalance({
    intermediary: { evm: record.recipient },
    destination: record.destination,
    rpcs: ctx.rpcs,
  });

/** What any funding needs, checked before the network is asked anything. */
const assertFundable = (
  request: FundingRequest,
  {
    wallet,
    withAccessToken,
  }: {
    wallet: Pick<WalletConnector, 'signingStandard'>;
    withAccessToken?: FundIntermediaryOptions['withAccessToken'];
  },
) => {
  requireSignableStandard(wallet);

  if (!isEvmChain(request.destination.chain)) {
    throw new FundingError(
      'QUOTE_FAILED',
      `funding pays out on EVM chains only, not ${request.destination.chain}`,
    );
  }

  if (request.source === 'confidential' && !withAccessToken) {
    throw new FundingError(
      'NOT_AUTHORIZED',
      'confidential funding needs an authorized user session',
    );
  }
};

export type FundingPreviewOptions = {
  intentsApi: Pick<IntentsApi, 'getQuote'>;
  connectApi: Pick<IntentsConnectApi, 'getIntermediary'>;
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getPublicKey'
  >;
  /** Required for confidential funding, as for `quoteFunding`. */
  withAccessToken?: FundIntermediaryOptions['withAccessToken'];
  now?: () => number;
};

/** What a funding would deliver, from a dry quote: nothing reserved. */
export type FundingPreview = {
  request: FundingRequest;
  /** The intermediary (EVM) the funds would reach. */
  recipient: string;
  /** Smallest unit of `request.originAsset`. */
  amountIn: string;
  /** Smallest unit of the destination token, before slippage. */
  amountOut: string;
  /** Smallest unit of the destination token: the least that arrives. */
  minAmountOut: string;
  amountInUsd?: string;
  amountOutUsd?: string;
  /** Seconds. */
  timeEstimate: number;
  correlationId: string;
};

/**
 * Prices a funding with a dry 1Click quote: what reaches the intermediary,
 * and how soon. Stores nothing, prompts nothing and creates no deposit
 * address, so it can run as the user types — unlike `quoteFunding`, whose
 * quote is the one the transfer pays. Not refused while another funding
 * runs: only `quoteFunding` is.
 */
export const previewFunding = async (
  request: FundingRequest,
  options: FundingPreviewOptions,
): Promise<FundingPreview> => {
  const { wallet, intentsApi, connectApi, withAccessToken, now } = options;
  const walletAddress = wallet.getAddress();
  const intentsAccountId = getWalletIntentsAccountId(wallet);

  if (!walletAddress || !intentsAccountId) {
    throw new FundingError(
      'WALLET_NOT_CONNECTED',
      'the wallet has not shared an address',
    );
  }

  assertFundable(request, options);

  const intermediary = await connectApi.getIntermediary(walletAddress, {
    publicKey: wallet.getPublicKey?.(),
  });

  const body: SwapQuoteRequest = {
    ...buildFundingQuoteRequest({
      request,
      intentsAccountId,
      recipient: intermediary.evm,
      now,
    }),
    dry: true,
  };

  let response: SwapQuoteResponse;

  try {
    response =
      request.source === 'confidential' && withAccessToken
        ? await withAccessToken((accessToken) =>
            intentsApi.getQuote(body, { accessToken }),
          )
        : await intentsApi.getQuote(body, {});
  } catch (error) {
    if (error instanceof FundingError) {
      throw error;
    }

    throw new FundingError('QUOTE_FAILED', toError(error).message, {
      cause: error,
    });
  }

  const { quote } = response;

  return {
    request,
    recipient: intermediary.evm,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minAmountOut: quote.minAmountOut,
    amountInUsd: quote.amountInUsd,
    amountOutUsd: quote.amountOutUsd,
    timeEstimate: quote.timeEstimate,
    correlationId: response.correlationId,
  };
};

/**
 * Quotes a funding and records it as `quoted`. Nothing moves and nothing is
 * signed. Refuses while another funding of the account, or an Intents
 * Connect execution of the wallet, is in progress — the steps that spend the
 * funds could not run until it ends.
 */
export const quoteFunding = async (
  request: FundingRequest,
  options: FundIntermediaryOptions,
): Promise<FundingRecord> => {
  const ctx = createContext(options);
  const { walletAddress, intentsAccountId } = requireAccount(ctx);

  assertFundable(request, ctx);
  ctx.phase('resolving');

  if (getActiveFunding(await ctx.store.load(intentsAccountId))) {
    throw new FundingError(
      'FUNDING_IN_FLIGHT',
      'another funding of this account is still in progress',
    );
  }

  const [inFlight] = await ctx.connectApi.listExecutions(walletAddress, {
    status: IN_FLIGHT_STATUSES,
  });

  if (inFlight) {
    failGuard(
      'EXECUTION_IN_FLIGHT',
      'an execution of this wallet is still in progress',
      { executionId: inFlight.id },
    );
  }

  const intermediary = await ctx.connectApi.getIntermediary(walletAddress, {
    publicKey: ctx.wallet.getPublicKey?.(),
  });

  const target = {
    recipient: intermediary.evm,
    destination: request.destination,
  };

  // Best effort: without a baseline, arrival is judged on the balance alone.
  const baselineBalance = await readBalance(ctx, target).catch(() => undefined);

  ctx.phase('quoting');

  const body = buildFundingQuoteRequest({
    request,
    intentsAccountId,
    recipient: intermediary.evm,
    now: ctx.now,
  });

  let response: SwapQuoteResponse;

  try {
    response = await ctx.call(request.source, (token) =>
      ctx.intentsApi.getQuote(body, token),
    );
  } catch (error) {
    if (error instanceof FundingError) {
      throw error;
    }

    throw new FundingError('QUOTE_FAILED', toError(error).message, {
      cause: error,
    });
  }

  const { quote, quoteRequest } = response;

  // The quote must be the one asked for: the transfer signed next pays it.
  if (
    !quote.depositAddress ||
    quote.amountIn !== request.amount ||
    quoteRequest.recipient !== body.recipient ||
    quoteRequest.refundTo !== body.refundTo ||
    quoteRequest.originAsset !== body.originAsset ||
    quoteRequest.destinationAsset !== body.destinationAsset ||
    quoteRequest.depositType !== body.depositType
  ) {
    throw new FundingError(
      'PAYLOAD_MISMATCH',
      'the quote does not match the funding requested',
      { meta: { correlationId: response.correlationId } },
    );
  }

  ctx.emit({ type: 'quoted', quote: response });
  await ctx.confirmQuote?.(response);

  const at = ctx.now();

  return ctx.save(
    {
      v: 1,
      id: quote.depositAddress,
      intentsAccountId,
      walletAddress,
      source: request.source,
      originAsset: request.originAsset,
      amountIn: request.amount,
      destination: request.destination,
      recipient: intermediary.evm,
      depositAddress: quote.depositAddress,
      depositMemo: quote.depositMemo,
      quote: {
        amountOut: quote.amountOut,
        minAmountOut: quote.minAmountOut,
        deadline: quote.deadline,
        timeWhenInactive: quote.timeWhenInactive,
        timeEstimate: quote.timeEstimate,
        withdrawFee: quote.withdrawFee,
      },
      correlationId: response.correlationId,
      baselineBalance,
      stage: 'quoted',
      context: request.context,
      createdAt: at,
      updatedAt: at,
    },
    {},
  );
};

/**
 * One run per key at a time; a second caller shares the first's result —
 * unless the first was aborted (a remount): that run is winding down, and
 * sharing it would hand its abort to a caller that never asked for one.
 */
const exclusive = (
  key: string,
  signal: AbortSignal | undefined,
  run: () => Promise<FundingRecord>,
): Promise<FundingRecord> => {
  const existing = running.get(key);

  if (existing && !existing.signal?.aborted) {
    return existing.promise;
  }

  const promise: Promise<FundingRecord> = run().finally(() => {
    if (running.get(key)?.promise === promise) {
      running.delete(key);
    }
  });

  running.set(key, { promise, signal });

  return promise;
};

const isRunning = (key: string) => {
  const entry = running.get(key);

  return !!entry && !entry.signal?.aborted;
};

/**
 * Has the wallet sign the transfer that funds a `quoted` record — one prompt —
 * and submits it. A declined prompt leaves the record `quoted`, so it can be
 * retried while the quote lives. Once submission starts, the outcome is only
 * learned from 1Click: the transfer is never signed again.
 */
export const signAndSubmitFunding = (
  record: FundingRecord,
  options: FundIntermediaryOptions,
): Promise<FundingRecord> => {
  if (record.stage !== 'quoted') {
    return Promise.reject(
      new FundingError(
        'FUNDING_IN_FLIGHT',
        `this funding is already ${record.stage}`,
      ),
    );
  }

  if (isRunning(`sign:${record.id}`) || isRunning(`watch:${record.id}`)) {
    return Promise.reject(
      new FundingError('FUNDING_IN_FLIGHT', 'this funding is in progress'),
    );
  }

  return exclusive(`sign:${record.id}`, options.signal, async () => {
    const ctx = createContext(options);
    const expiry = expiryOf(record);

    if (expiry !== undefined && ctx.now() > expiry - QUOTE_MARGIN_MS) {
      await ctx.save(record, { stage: 'abandoned', error: 'quote expired' });
      throw new FundingError(
        'QUOTE_EXPIRED',
        'the quote expired before the transfer was signed',
      );
    }

    ctx.phase('awaiting-signature');

    const standard = requireSignableStandard(ctx.wallet);
    let generated;

    try {
      generated = await ctx.call(record.source, (token) =>
        ctx.intentsApi.generateIntent(
          {
            type: 'swap_transfer',
            standard,
            signerId: record.intentsAccountId,
            depositAddress: record.depositAddress,
          },
          token,
        ),
      );
    } catch (error) {
      if (error instanceof FundingError) {
        throw error;
      }

      const { message } = toError(error);
      const expired = /expire|inactive|not found/i.test(message);

      if (expired) {
        await ctx.save(record, { stage: 'abandoned', error: message });
      }

      throw new FundingError(
        expired ? 'QUOTE_EXPIRED' : 'QUOTE_FAILED',
        message,
        { cause: error, meta: { depositAddress: record.depositAddress } },
      );
    }

    assertPreparedIntent(generated.intent, standard);

    const signed = await signPreparedIntent(ctx.wallet, generated.intent, {
      ...ctx.nearRpc,
      expect: {
        signerId: record.intentsAccountId,
        depositAddress: record.depositAddress,
        tokenId: record.originAsset,
        amount: record.amountIn,
        rail: FUNDING_RAIL[record.source],
      },
    });

    // Persisted BEFORE submitting: from here a reload must watch, not re-sign.
    let current = await ctx.save(record, { stage: 'submitting' });

    ctx.phase('submitting');

    try {
      const { intentHash } = await ctx.call(record.source, (token) =>
        ctx.intentsApi.submitIntent(
          { type: 'swap_transfer', signedData: signed },
          token,
        ),
      );

      current = await ctx.save(current, { stage: 'submitted', intentHash });
    } catch (error) {
      const refused =
        error instanceof IntentsApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        !error.isUnauthorized;

      if (!refused) {
        // Unknown outcome (network, 5xx): watch; 1Click says what happened.
        return ctx.save(current, { stage: 'submitted' });
      }

      // Refused — unless 1Click already saw the transfer anyway.
      const status = await ctx
        .call(record.source, (token) =>
          ctx.intentsApi.getSwapStatus(
            {
              depositAddress: record.depositAddress,
              depositMemo: record.depositMemo,
            },
            token,
          ),
        )
        .catch(() => undefined);

      if (!status || status.status === 'PENDING_DEPOSIT') {
        await ctx.save(current, { stage: 'quoted' });
        throw new FundingError('SUBMIT_REJECTED', toError(error).message, {
          cause: error,
          meta: { depositAddress: record.depositAddress },
        });
      }

      current = await ctx.save(current, {
        stage: 'submitted',
        status: status.status,
      });
    }

    return current;
  });
};

const pollStatus = async (
  ctx: Context,
  record: FundingRecord,
): Promise<{ result: SwapStatusResult; record: FundingRecord }> => {
  const startedAt = ctx.now();
  const timeout = ctx.statusTimeoutMs ?? 30 * 60_000;
  let errors = 0;
  let current = record;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const elapsed = ctx.now() - startedAt;

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await ctx.call(record.source, (token) =>
        ctx.intentsApi.getSwapStatus(
          {
            depositAddress: record.depositAddress,
            depositMemo: record.depositMemo,
          },
          token,
        ),
      );

      errors = 0;

      if (result.status !== current.status) {
        ctx.emit({ type: 'status', status: result.status });
        // eslint-disable-next-line no-await-in-loop
        current = await ctx.save(current, { status: result.status });
      }

      if (['SUCCESS', 'REFUNDED', 'FAILED'].includes(result.status)) {
        return { result, record: current };
      }

      const expiry = expiryOf(current);

      if (
        result.status === 'PENDING_DEPOSIT' &&
        expiry !== undefined &&
        ctx.now() > expiry + ABANDON_AFTER_MS
      ) {
        // eslint-disable-next-line no-await-in-loop
        await ctx.save(current, {
          stage: 'abandoned',
          error: 'the transfer never arrived',
        });
        throw new FundingError(
          'QUOTE_EXPIRED',
          'the transfer never reached 1Click; nothing moved',
          { meta: { depositAddress: record.depositAddress } },
        );
      }
    } catch (error) {
      if (error instanceof FundingError) {
        throw error;
      }

      const unknownYet =
        error instanceof IntentsApiError &&
        (error.status === 404 || error.status === 400) &&
        elapsed < NOT_FOUND_GRACE_MS;

      if (!unknownYet) {
        errors += 1;

        if (errors >= MAX_POLL_ERRORS) {
          throw error;
        }
      }
    }

    if (ctx.now() - startedAt > timeout) {
      throw new FundingError(
        'STATUS_TIMEOUT',
        'no final swap status yet — resume to keep watching',
        { meta: { depositAddress: record.depositAddress } },
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(
      elapsed > SLOW_POLL_AFTER_MS
        ? SLOW_POLL_MS
        : (ctx.pollIntervalMs ?? 3000),
      ctx.signal,
    );
  }
};

/**
 * The payout is a single transfer, so it has landed once the balance grew by
 * a good part of the minimum — robust to how 1Click reports fees.
 */
const arrived = (record: FundingRecord, balance: string) =>
  BigInt(balance) - BigInt(record.baselineBalance ?? '0') >=
  BigInt(record.quote.minAmountOut) / 2n;

const waitForArrival = async (
  ctx: Context,
  record: FundingRecord,
): Promise<string> => {
  const startedAt = ctx.now();
  const timeout = ctx.arrivalTimeoutMs ?? 5 * 60_000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const balance = await readBalance(ctx, record).catch(() => undefined);

    if (balance !== undefined && arrived(record, balance)) {
      return balance;
    }

    if (ctx.now() - startedAt > timeout) {
      throw new FundingError(
        'ARRIVAL_TIMEOUT',
        'the swap succeeded but the funds are not visible at the intermediary yet',
        { meta: { depositAddress: record.depositAddress } },
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(ctx.pollIntervalMs ?? 3000, ctx.signal);
  }
};

/**
 * Follows a submitted funding to the end: 1Click's status, then the funds at
 * the intermediary. Resolves with the record `arrived`; throws `REFUNDED`,
 * `SWAP_FAILED`, `QUOTE_EXPIRED` (never funded) or a resumable timeout.
 * Never prompts the wallet. Concurrent calls for one funding share one watch.
 */
export const watchFunding = (
  record: FundingRecord,
  options: FundIntermediaryOptions,
): Promise<FundingRecord> =>
  exclusive(`watch:${record.id}`, options.signal, async () => {
    const ctx = createContext(options);
    let current = record;

    if (current.stage === 'submitting' || current.stage === 'submitted') {
      ctx.phase('bridging');

      const polled = await pollStatus(ctx, current);
      const { result } = polled;

      current = polled.record;

      if (result.status === 'REFUNDED') {
        const refundedAmount = result.swapDetails?.refundedAmount;

        await ctx.save(current, { stage: 'refunded', refundedAmount });
        throw new FundingError(
          'REFUNDED',
          `the swap was refunded to your ${record.source === 'confidential' ? 'confidential' : 'intents'} balance`,
          {
            meta: {
              depositAddress: record.depositAddress,
              refundedAmount,
              correlationId: result.correlationId,
            },
          },
        );
      }

      if (result.status === 'FAILED') {
        await ctx.save(current, {
          stage: 'failed',
          error: result.swapDetails?.refundReason ?? 'swap failed',
        });
        throw new FundingError('SWAP_FAILED', 'the swap failed', {
          meta: {
            depositAddress: record.depositAddress,
            correlationId: result.correlationId,
          },
        });
      }

      current = await ctx.save(current, {
        stage: 'settled',
        amountOut: result.swapDetails?.amountOut ?? undefined,
      });
    }

    if (current.stage === 'settled') {
      ctx.phase('awaiting-arrival');

      const balance = await waitForArrival(ctx, current);

      current = await ctx.save(current, {
        stage: 'arrived',
        arrivedBalance: balance,
      });
    }

    return current;
  });

/**
 * The whole first leg: quote, one signature, and the funds at the
 * intermediary. Resolves with the record `arrived`, ready for the steps
 * that spend it.
 */
export const fundIntermediaryFromIntents = async (
  request: FundingRequest,
  options: FundIntermediaryOptions,
): Promise<FundingRecord> => {
  const quoted = await quoteFunding(request, options);
  const submitted = await signAndSubmitFunding(quoted, options);

  return watchFunding(submitted, options);
};

/**
 * Picks a stored funding up after a reload. Never prompts: a `quoted` record
 * is returned as-is (the caller may offer to sign it while the quote lives),
 * a submitted one is watched to the end.
 */
export const resumeFunding = async (
  record: FundingRecord,
  options: FundIntermediaryOptions,
): Promise<FundingRecord> => {
  switch (record.stage) {
    case 'submitting':
    case 'submitted':
    case 'settled':
      return watchFunding(record, options);

    case 'quoted': {
      const expiry = expiryOf(record);
      const now = options.now ?? Date.now;

      if (expiry !== undefined && now() > expiry - QUOTE_MARGIN_MS) {
        return createContext(options).save(record, {
          stage: 'abandoned',
          error: 'quote expired',
        });
      }

      return record;
    }

    default:
      return record;
  }
};
