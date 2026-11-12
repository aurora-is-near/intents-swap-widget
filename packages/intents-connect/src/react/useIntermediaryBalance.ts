import type { ResourceStatus } from '@/resource';
import type { RecipeDestination } from '@/types/recipe';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';
import { useResourceKey } from '@/react/useResourceKey';

export type UseIntermediaryBalanceResult = {
  /** The wallet's intermediary (EVM), once resolved. */
  intermediary?: string;
  /** What it holds of the destination token, smallest unit. */
  balance?: string;
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

/**
 * What the wallet's Intents Connect intermediary holds of a recipe's
 * destination token — e.g. funds a funding swap delivered that were not
 * spent yet. EVM destinations only.
 */
export const useIntermediaryBalance = ({
  destination,
  refreshIntervalMs = 30_000,
}: {
  destination: RecipeDestination;
  /** Milliseconds; `0` disables polling. */
  refreshIntervalMs?: number;
}): UseIntermediaryBalanceResult => {
  const { intermediaryBalances } = useIntentsAccountContext();
  const { wallet } = useIntentsConnect();
  const address = wallet?.getAddress();

  const key = address
    ? JSON.stringify([
        address,
        wallet?.getPublicKey?.() ?? null,
        {
          chain: destination.chain,
          assetId: destination.assetId,
          tokenAddress: destination.tokenAddress,
        },
      ])
    : undefined;

  const { snapshot, refresh } = useResourceKey(
    intermediaryBalances,
    key,
    refreshIntervalMs,
  );

  return {
    intermediary: snapshot.data?.intermediary,
    balance: snapshot.data?.balance,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
