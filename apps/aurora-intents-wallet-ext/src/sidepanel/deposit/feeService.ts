import { FEE_SERVICE_API_KEY, FEE_SERVICE_URL } from '../config';

export type DepositAddress = { address: string; memo?: string };

/** One deposit to a persistent address, as the fee service reports it. */
export type DepositRecord = {
  tx_hash: string;
  fromChain?: string | null;
  asset_id: string | null;
  decimals: number | null;
  amount: string;
  created_at: string;
  deposit_address: string;
};

type DepositRecordType = 'received' | 'success' | 'failed';

class FeeServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Busy (429: an address is being created concurrently) or a server error. */
export const isRetryable = (error: unknown) =>
  error instanceof FeeServiceError &&
  (error.status === 429 || error.status >= 500);

/** `path` is the route before the app key, `query` what follows it. */
const request = async <T>(
  path: string,
  init?: RequestInit,
  query?: URLSearchParams,
): Promise<T> => {
  const response = await fetch(
    `${FEE_SERVICE_URL}/api/${path}/${FEE_SERVICE_API_KEY}${query ? `?${query.toString()}` : ''}`,
    init,
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new FeeServiceError(
      body?.message ?? `Fee service returned HTTP ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
};

/**
 * The persistent address for deposits from `depositChain` (`evm` = every EVM
 * chain) into the intents account `recipient`. Stable: the same inputs always
 * return the same address.
 */
export const getPersistentDepositAddress = async ({
  recipient,
  sender,
  depositChain,
  destination,
}: {
  recipient: string;
  sender: string;
  depositChain: string;
  /** `asset` is an asset ID or a symbol unique on `chain`. */
  destination: { chain: string; asset: string };
}): Promise<DepositAddress> => {
  const { depositAddress, memo } = await request<{
    depositAddress: string;
    memo?: string;
  }>('persistent-deposit-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient,
      recipientType: 'INTENTS',
      sender,
      depositChain,
      destinationChain: destination.chain,
      destinationAsset: destination.asset,
    }),
  });

  return { address: depositAddress, memo };
};

export const getPersistentDepositStatus = async (
  address: string,
  type: DepositRecordType,
): Promise<DepositRecord[]> => {
  const { deposits } = await request<{ deposits: DepositRecord[] }>(
    'persistent-deposit-status',
    undefined,
    new URLSearchParams({ address, type, limit: '10' }),
  );

  return deposits;
};
