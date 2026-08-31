import { polygon } from 'viem/chains';
import { createPublicClient, http, parseAbi } from 'viem';

import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';
import type { ExecutionPlan } from '@aurora-is-near/intents-connect';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import {
  POL_USDC_ASSET,
  POLYGON_RPC,
  polymarketDepositRecipe,
} from './constants';
import type { PolymarketParams } from './constants';

export const polygonPublic = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC, { batch: true }),
});

export const ERC20_BALANCE_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

/**
 * Synchronous, unlike `buildHydrexPlan`: the steps are fully determined by the
 * account address, so there is nothing to read on-chain first.
 */
export const buildPolymarketPlan = ({
  token,
  amountAtomic,
  depositViaWallet,
  account,
}: {
  token: Token;
  amountAtomic: string;
  depositViaWallet: boolean;
  account: string;
}): ExecutionPlan<PolymarketParams> => ({
  recipe: polymarketDepositRecipe,
  params: { account },
  quote: {
    originAsset: token.assetId,
    destinationAsset: POL_USDC_ASSET,
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
  // The account address rides in `params`, never in `quote.recipient` — the
  // SDK rejects any recipient on a bridge-in before it makes a single request.
  depositViaWallet,
});
