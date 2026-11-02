import { readEvmTokenBalance } from '@/balances/evm';
import { resolveRpcs } from '@/balances/rpcs';
import type { BalanceTransportOptions, ChainRpcUrls } from '@/balances/types';
import { isEvmChain } from '@/chains';
import { IntentsConnectError } from '@/errors';
import type { Intermediary } from '@/types/execution';
import type { RecipeDestination } from '@/types/recipe';

export type GetIntermediaryBalanceArgs = {
  intermediary: Pick<Intermediary, 'evm'>;
  destination: RecipeDestination;
  /** Per-chain overrides of the default public RPCs. */
  rpcs?: ChainRpcUrls;
} & BalanceTransportOptions;

/**
 * What the user's Intents Connect intermediary holds of `destination`, in
 * the smallest unit — funds a funding swap delivered that no execution has
 * spent yet. EVM destinations only. Throws on an RPC failure; never reads one
 * as zero.
 */
export const getIntermediaryBalance = async ({
  intermediary,
  destination,
  rpcs,
  ...transport
}: GetIntermediaryBalanceArgs): Promise<string> => {
  if (!isEvmChain(destination.chain)) {
    throw new IntentsConnectError(
      `intermediary balances are read on EVM chains only, not ${destination.chain}`,
    );
  }

  return readEvmTokenBalance({
    owner: intermediary.evm,
    tokenAddress: destination.tokenAddress,
    rpcUrls: resolveRpcs(rpcs)[destination.chain] ?? [],
    ...transport,
  });
};
