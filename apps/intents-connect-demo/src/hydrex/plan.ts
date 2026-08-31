import { base } from 'viem/chains';
import { createPublicClient, http, parseAbi } from 'viem';

import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';
import type { ExecutionPlan } from '@aurora-is-near/intents-connect';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { BASE_RPC, DEST_ASSET, hydrexMintRecipe, POOL } from './constants';
import type { MintParams } from './constants';

/**
 * `chain` is what makes `multicall` usable — without it viem cannot resolve
 * multicall3's address and throws. `batch: true` coalesces the reads the
 * positions list fires into a single HTTP POST.
 */
export const basePublic = createPublicClient({
  chain: base,
  transport: http(BASE_RPC, { batch: true }),
});

export const POOL_ABI = parseAbi([
  'function globalState() view returns (uint160 price, int24 tick, uint16 lastFee, uint8 pluginConfig, uint16 communityFee, bool unlocked)',
]);

export const buildHydrexPlan = async ({
  token,
  amountAtomic,
  depositViaWallet,
}: {
  token: Token;
  amountAtomic: string;
  depositViaWallet: boolean;
}): Promise<ExecutionPlan<MintParams>> => {
  // The range must sit strictly BELOW the live tick: the position is then
  // 100% token1 (WETH) — the one asset the bridge delivers. A straddling
  // range would revert the mint on-chain (gas estimation won't catch it).
  const [, tick] = await basePublic.readContract({
    address: POOL,
    abi: POOL_ABI,
    functionName: 'globalState',
  });

  const tickUpper = Number(tick) - 2;
  const tickLower = tickUpper - 100;

  return {
    recipe: hydrexMintRecipe,
    params: { tickLower: String(tickLower), tickUpper: String(tickUpper) },
    quote: {
      originAsset: token.assetId,
      destinationAsset: DEST_ASSET,
      amount: amountAtomic,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      deadline: new Date(Date.now() + 15 * 60_000).toISOString(),
    },
    originChain: token.blockchain,
    originToken: {
      contractAddress: token.contractAddress,
      decimals: token.decimals,
    },
    originChainId: EVM_CHAIN_IDS[token.blockchain] ?? null,
    // `false` is the QR / exchange path: no wallet transfer is attempted, the
    // deposit address is surfaced instead and the backend's watcher observes
    // the funds arriving.
    depositViaWallet,
  };
};
