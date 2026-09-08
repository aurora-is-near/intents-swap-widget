import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';

import type { BuildPlanFn } from '../shared/hooks/useIntentsConnectDeposit';
import { aaveSupplyRecipe, DEST_ASSET } from './constants';

export const buildAavePlan: BuildPlanFn<void> = ({
  token,
  amountAtomic,
  depositViaWallet,
}) => ({
  recipe: aaveSupplyRecipe,
  params: undefined,
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
  depositViaWallet,
});
