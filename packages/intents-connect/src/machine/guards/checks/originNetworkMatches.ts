import { failGuard } from '@/errors';

/**
 * EVM origins only: the wallet must be on the origin chain before it can send
 * the deposit. Skipped when the connector exposes no chain id.
 */
export const originNetworkMatches = async (
  getChainId: (() => Promise<number>) | undefined,
  expectedChainId: number | null | undefined,
) => {
  if (!getChainId || expectedChainId == null) {
    return;
  }

  const actual = await getChainId();

  if (actual !== expectedChainId) {
    failGuard(
      'NETWORK_MISMATCH',
      `wallet is on chain ${actual} but the origin requires chain ${expectedChainId}`,
    );
  }
};
