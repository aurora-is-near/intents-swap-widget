import { tonAddressKey } from '@/account/ton';
import { BalanceRpcError } from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';
import type { FetchLike } from '@/http';

const DEFAULT_TIMEOUT = 10_000;
/**
 * Without a key toncenter allows about one request per second: the jetton
 * read waits this long after the balance read.
 */
const KEYLESS_SPACING_MS = 1_100;
/** Reads of one account this close together share a response. */
const SHARE_MS = 2_000;
const JETTON_PAGE = 100;

type TonAccount = {
  /** Nanotons. */
  balance: string;
  /** Jetton balances by master address (`tonAddressKey`). */
  jettons: Map<string, string>;
};

type SharedRead = { at: number; account: Promise<TonAccount> };

/** One function, so reads through the global `fetch` share a cache. */
const globalFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

/** Per transport, so callers with their own `fetch` never share reads. */
const sharedReads = new WeakMap<FetchLike, Map<string, SharedRead>>();

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getJson = async <T>(
  doFetch: FetchLike,
  url: string,
  apiKey: string | undefined,
  timeout: number,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await doFetch(url, {
      method: 'GET',
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`responded ${response.status}`);
    }

    return JSON.parse(raw) as T;
  } finally {
    clearTimeout(timer);
  }
};

/** The balance, then (when asked) every jetton, from one endpoint. */
const fetchAccount = async (
  apiUrls: readonly string[],
  address: string,
  withJettons: boolean,
  apiKey: string | undefined,
  doFetch: FetchLike,
  timeout: number,
): Promise<TonAccount> => {
  let lastError = 'no toncenter endpoint configured';

  // eslint-disable-next-line no-restricted-syntax
  for (const url of apiUrls) {
    const base = `${url.replace(/\/$/, '')}/api/v3`;
    const owner = encodeURIComponent(address);

    try {
      // eslint-disable-next-line no-await-in-loop
      const wallet = await getJson<{ balance?: string }>(
        doFetch,
        `${base}/walletInformation?address=${owner}&use_v2=false`,
        apiKey,
        timeout,
      );

      const jettons = new Map<string, string>();

      if (withJettons) {
        if (!apiKey) {
          // eslint-disable-next-line no-await-in-loop
          await delay(KEYLESS_SPACING_MS);
        }

        // eslint-disable-next-line no-await-in-loop
        const page = await getJson<{
          jetton_wallets?: { jetton: string; balance: string }[];
        }>(
          doFetch,
          `${base}/jetton/wallets?owner_address=${owner}&limit=${JETTON_PAGE}`,
          apiKey,
          timeout,
        );

        page.jetton_wallets?.forEach(({ jetton, balance }) => {
          const key = tonAddressKey(jetton);

          if (key) {
            jettons.set(key, balance);
          }
        });
      }

      return { balance: wallet.balance ?? '0', jettons };
    } catch (error) {
      lastError = `${url}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new BalanceRpcError(`TON balances unavailable: ${lastError}`);
};

/**
 * TON and jetton balances of a TON wallet from toncenter's v3 API
 * (`walletInformation`, then `jetton/wallets`). Jettons are matched by their
 * master (`contractAddress`, any address form). An account that doesn't
 * exist yet reads as zero.
 *
 * Without `apiKey` toncenter allows about one request per second: the two
 * calls are spaced, and reads of one account a moment apart share them.
 */
export const readTonBalances = async ({
  address,
  tokens,
  apiUrls,
  apiKey,
  fetch: fetchImpl,
  timeout = DEFAULT_TIMEOUT,
}: {
  address: string;
  tokens: readonly BalanceToken[];
  /** toncenter-compatible endpoints, tried in order. */
  apiUrls: readonly string[];
  /** toncenter's `X-API-Key`. */
  apiKey?: string;
} & BalanceTransportOptions): Promise<Record<string, string>> => {
  const doFetch = fetchImpl ?? globalFetch;
  const withJettons = tokens.some((token) => !isNativeToken(token));
  const reads = sharedReads.get(doFetch) ?? new Map<string, SharedRead>();
  const key = `${apiUrls.join(' ')}|${apiKey ?? ''}|${withJettons}|${address}`;

  sharedReads.set(doFetch, reads);

  let read = reads.get(key);

  if (!read || Date.now() - read.at >= SHARE_MS) {
    const fresh: SharedRead = {
      at: Date.now(),
      account: fetchAccount(
        apiUrls,
        address,
        withJettons,
        apiKey,
        doFetch,
        timeout,
      ),
    };

    reads.set(key, fresh);
    // A failure is not shared: the next read tries again.
    fresh.account.catch(() => {
      if (reads.get(key) === fresh) {
        reads.delete(key);
      }
    });
    read = fresh;
  }

  const account = await read.account;
  const balances: Record<string, string> = {};

  tokens.forEach((token) => {
    if (isNativeToken(token)) {
      balances[token.assetId] = /^\d+$/.test(account.balance)
        ? account.balance
        : '0';

      return;
    }

    const master = token.contractAddress
      ? tonAddressKey(token.contractAddress)
      : undefined;

    const amount = master ? account.jettons.get(master) : undefined;

    balances[token.assetId] = amount && /^\d+$/.test(amount) ? amount : '0';
  });

  return balances;
};
