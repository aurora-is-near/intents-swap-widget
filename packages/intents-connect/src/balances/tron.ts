import { BalanceRpcError } from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';
import type { FetchLike } from '@/http';

const DEFAULT_TIMEOUT = 10_000;
/**
 * Without a key TronGrid allows about one request per second, and a second
 * one suspends the client for 5 s. Hooks mounting one after another each
 * read the account: reads of one account this close together share a
 * response.
 */
const SHARE_MS = 2_000;

type TronGridAccount = {
  /** TRX in sun, absent when zero. Frozen TRX is not included. */
  balance?: number;
  /** One `{ [contract]: amount }` object per TRC-20 the account holds. */
  trc20?: Record<string, string>[];
};

type TronGridResponse = { success?: boolean; data?: TronGridAccount[] };

type SharedRead = { at: number; account: Promise<TronGridAccount | null> };

/** One function, so reads through the global `fetch` share a cache. */
const globalFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

/** Per transport, so callers with their own `fetch` never share reads. */
const sharedReads = new WeakMap<FetchLike, Map<string, SharedRead>>();

/** The account, `null` when it isn't activated yet (never received TRX). */
const fetchAccount = async (
  apiUrls: readonly string[],
  address: string,
  apiKey: string | undefined,
  { fetch: fetchImpl, timeout = DEFAULT_TIMEOUT }: BalanceTransportOptions,
): Promise<TronGridAccount | null> => {
  const doFetch: FetchLike =
    fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  let lastError = 'no TronGrid endpoint configured';

  // eslint-disable-next-line no-restricted-syntax
  for (const base of apiUrls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await doFetch(
        `${base.replace(/\/$/, '')}/v1/accounts/${encodeURIComponent(address)}`,
        {
          method: 'GET',
          headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : undefined,
          signal: controller.signal,
        },
      );

      // eslint-disable-next-line no-await-in-loop
      const raw = await response.text();
      const body = response.ok
        ? (JSON.parse(raw) as TronGridResponse)
        : undefined;

      if (body?.success && Array.isArray(body.data)) {
        return body.data[0] ?? null;
      }

      // Without a key TronGrid allows about one request per second, and
      // answers more with an error body.
      lastError = `${base} responded ${response.status}`;
    } catch (error) {
      lastError = `${base}: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new BalanceRpcError(`TRON balances unavailable: ${lastError}`);
};

/** `fetchAccount`, sharing a read made in the last `SHARE_MS`. */
const readAccount = (
  apiUrls: readonly string[],
  address: string,
  apiKey: string | undefined,
  transport: BalanceTransportOptions,
): Promise<TronGridAccount | null> => {
  const doFetch = transport.fetch ?? globalFetch;
  const reads = sharedReads.get(doFetch) ?? new Map<string, SharedRead>();
  const key = `${apiUrls.join(' ')}|${apiKey ?? ''}|${address}`;
  const recent = reads.get(key);

  sharedReads.set(doFetch, reads);

  if (recent && Date.now() - recent.at < SHARE_MS) {
    return recent.account;
  }

  const read: SharedRead = {
    at: Date.now(),
    account: fetchAccount(apiUrls, address, apiKey, {
      ...transport,
      fetch: doFetch,
    }),
  };

  reads.set(key, read);
  // A failure is not shared: the next read tries again.
  read.account.catch(() => {
    if (reads.get(key) === read) {
      reads.delete(key);
    }
  });

  return read.account;
};

/**
 * TRX and TRC-20 balances of a TRON account, in one TronGrid call
 * (`/v1/accounts/{T…}`). TRC-20 tokens are matched by their contract
 * (`contractAddress`, base58). Frozen TRX is not spendable and not counted.
 *
 * An account that isn't activated yet holds nothing.
 */
export const readTronBalances = async ({
  address,
  tokens,
  apiUrls,
  apiKey,
  ...transport
}: {
  address: string;
  tokens: readonly BalanceToken[];
  /** TronGrid-compatible endpoints, tried in order. */
  apiUrls: readonly string[];
  /** TronGrid's `TRON-PRO-API-KEY`, for more than ~1 request per second. */
  apiKey?: string;
} & BalanceTransportOptions): Promise<Record<string, string>> => {
  const account = await readAccount(apiUrls, address, apiKey, transport);
  const held = new Map<string, string>();

  account?.trc20?.forEach((entry) => {
    Object.entries(entry).forEach(([contract, amount]) => {
      held.set(contract, amount);
    });
  });

  const balances: Record<string, string> = {};

  tokens.forEach((token) => {
    if (isNativeToken(token)) {
      balances[token.assetId] = BigInt(
        Math.trunc(account?.balance ?? 0),
      ).toString();

      return;
    }

    const amount = token.contractAddress
      ? held.get(token.contractAddress)
      : undefined;

    balances[token.assetId] = amount && /^\d+$/.test(amount) ? amount : '0';
  });

  return balances;
};
