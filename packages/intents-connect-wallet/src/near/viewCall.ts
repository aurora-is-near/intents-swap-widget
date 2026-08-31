import { DEFAULT_RPC_URLS } from '@/near/config';

type QueryResponse = { result?: number[] };

/**
 * Minimal NEAR view call over JSON-RPC.
 *
 * The widget routes these through `near-api-js`' failover provider plus zod
 * decoding. Doing it with `fetch` keeps this package dependency-free, which is
 * the point of the split — the only NEAR-specific weight left is the caller's
 * own wallet object.
 */
export const viewCall = async <T>({
  contractId,
  methodName,
  args,
  rpcUrls = DEFAULT_RPC_URLS,
}: {
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
  rpcUrls?: readonly string[];
}): Promise<T> => {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 'intents-connect',
    method: 'query',
    params: {
      request_type: 'call_function',
      account_id: contractId,
      method_name: methodName,
      args_base64: btoa(JSON.stringify(args)),
      finality: 'optimistic',
    },
  });

  let lastError: unknown;

  const attempt = async (url: string): Promise<{ value: T } | undefined> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const payload = (await response.json()) as {
      result?: QueryResponse;
      error?: unknown;
    };

    if (payload.error) {
      lastError = payload.error;

      return undefined;
    }

    const bytes = payload.result?.result;

    if (!bytes) {
      lastError = new Error(`No result from ${methodName} on ${contractId}`);

      return undefined;
    }

    return {
      value: JSON.parse(new TextDecoder().decode(new Uint8Array(bytes))) as T,
    };
  };

  // eslint-disable-next-line no-restricted-syntax
  for (const url of rpcUrls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await attempt(url);

      if (result) {
        return result.value;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `NEAR view call ${methodName} on ${contractId} failed: ${String(lastError)}`,
  );
};

/** `storage_balance_bounds().min` — the registration cost for a NEP-141. */
export const getMinStorageBalance = async (
  contractId: string,
  rpcUrls?: readonly string[],
): Promise<bigint> => {
  const bounds = await viewCall<{ min: string }>({
    contractId,
    methodName: 'storage_balance_bounds',
    args: {},
    rpcUrls,
  });

  return BigInt(bounds.min);
};

/** `storage_balance_of(accountId).total`, or 0 when unregistered. */
export const getStorageBalance = async (
  contractId: string,
  accountId: string,
  rpcUrls?: readonly string[],
): Promise<bigint> => {
  const balance = await viewCall<{ total: string } | null>({
    contractId,
    methodName: 'storage_balance_of',
    args: { account_id: accountId },
    rpcUrls,
  });

  return BigInt(balance?.total ?? '0');
};
