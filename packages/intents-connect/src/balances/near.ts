import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';
import { NearContractError, NearRpcError } from '@/near/errors';
import { getNativeNearBalance, viewCall } from '@/near/rpc';

/** Concurrent `ft_balance_of` calls — gentle on public endpoints. */
const CONCURRENCY = 6;

const mapLimited = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next;

      next += 1;

      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await run(items[index]);

        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
};

/**
 * NEAR balances: `view_account` for native NEAR and `ft_balance_of` for each
 * NEP-141 (NEAR token lists are short). A token whose contract rejects the
 * call is skipped; the chain only fails when the RPC itself is unreachable.
 */
export const readNearBalances = async ({
  address,
  tokens,
  rpcUrls,
  ...transport
}: {
  address: string;
  tokens: readonly BalanceToken[];
  rpcUrls: readonly string[];
} & BalanceTransportOptions): Promise<Record<string, string>> => {
  const settled = await mapLimited(tokens, CONCURRENCY, async (token) => {
    if (isNativeToken(token)) {
      return getNativeNearBalance(address, { rpcUrls, ...transport });
    }

    const balance = await viewCall<string | null>({
      contractId: token.contractAddress!,
      methodName: 'ft_balance_of',
      args: { account_id: address },
      rpcUrls,
      ...transport,
    });

    return balance ?? '0';
  });

  const balances: Record<string, string> = {};
  let transportFailure: unknown;

  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      balances[tokens[index].assetId] = outcome.value;
    } else if (!(outcome.reason instanceof NearContractError)) {
      transportFailure = outcome.reason;
    }
  });

  if (!Object.keys(balances).length && transportFailure) {
    throw transportFailure instanceof Error
      ? transportFailure
      : new NearRpcError(String(transportFailure));
  }

  return balances;
};
