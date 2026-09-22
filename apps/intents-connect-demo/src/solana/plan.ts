import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';
import type {
  ExecutionPlan,
  ExecutionPreview,
  IntentsConnectApi,
  SolanaRecipe,
} from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { BuildPlanFn } from '../shared/hooks/useIntentsConnectDeposit';

import {
  BRIDGE_AMOUNT_RESERVE_BPS,
  BRIDGE_SLIPPAGE_BPS,
  getBuyToken,
  PREVIEW_VALIDITY_MS,
  SOLANA_USDC,
} from './constants';
import { buildJupiterSwap } from './jupiter';
import { getSolanaConnection, validateMints } from './client';

export type SolanaBuyParams = { outputMint: string };
export type SolanaBuyQuote = {
  preview: ExecutionPreview<SolanaBuyParams>;
  outputMint: string;
  estimatedOutput: string;
  minimumOutput: string;
  recipientAta: string;
  networkFee: string;
  expiresAt: number;
  /** The DEXes Jupiter routed through at quote time, when it reported them. */
  route?: string;
};

export const buildSolanaPlan = (
  args: Parameters<BuildPlanFn<SolanaBuyParams>>[0] & SolanaBuyParams,
): ExecutionPlan<SolanaBuyParams> => {
  const { token, amountAtomic, depositViaWallet, outputMint } = args;
  const output = getBuyToken(outputMint);

  if (token.blockchain === 'sol' || token.isIntent) {
    throw new Error('Choose a supported source asset on another chain');
  }

  const recipe: SolanaRecipe<SolanaBuyParams> = {
    id: `solana-buy-${output.symbol.toLowerCase()}`,
    intent: `solana_buy_${output.symbol.toLowerCase()}`,
    title: `Buy ${output.symbol} into your Connect account`,
    type: 'solana',
    flow: 'bridge-in',
    destination: {
      chain: 'sol',
      assetId: SOLANA_USDC.assetId,
      tokenAddress: SOLANA_USDC.mint,
    },
    buildSteps: async ({ intermediary, amount }) =>
      (
        await buildJupiterSwap({
          intermediary,
          amount,
          input: SOLANA_USDC,
          output,
        })
      ).prepared,
  };

  return {
    recipe,
    params: { outputMint },
    feeStrategy: {
      kind: 'threeRound',
      amountReserveBps: BRIDGE_AMOUNT_RESERVE_BPS,
    },
    quote: {
      originAsset: token.assetId,
      destinationAsset: SOLANA_USDC.assetId,
      amount: amountAtomic,
      swapType: 'EXACT_INPUT',
      slippageTolerance: BRIDGE_SLIPPAGE_BPS,
      deadline: new Date(Date.now() + 15 * 60_000).toISOString(),
    },
    originChain: token.blockchain,
    originToken: {
      contractAddress: token.contractAddress,
      decimals: token.decimals,
    },
    originChainId: EVM_CHAIN_IDS[token.blockchain] ?? null,
    depositViaWallet,
  };
};

export const previewSolanaBuy = async (
  api: IntentsConnectApi,
  exec: Pick<UseExecutionResult, 'preview'>,
  plan: ExecutionPlan<SolanaBuyParams>,
): Promise<SolanaBuyQuote> => {
  const output = getBuyToken(plan.params.outputMint);
  const supported = await api.listSupportedTokens('inOperation');

  if (
    !supported.in?.some((token) => token.assetId === plan.quote.originAsset) ||
    !supported.out?.some((token) => token.assetId === SOLANA_USDC.assetId)
  ) {
    throw new Error('Connect does not currently support this bridge route');
  }

  if (
    [...(supported.in ?? []), ...(supported.out ?? [])].some(
      (token) =>
        token.blockchain === 'sol' && token.contractAddress === output.mint,
    )
  ) {
    throw new Error(
      `${output.symbol} is now supported by 1Click; select another demo token`,
    );
  }

  await validateMints(getSolanaConnection(), [SOLANA_USDC, output]);

  // Each preview owns its results: gross probing must never overwrite another
  // request's final quote. Only the last, fee-adjusted build is displayed.
  let finalSwap: Awaited<ReturnType<typeof buildJupiterSwap>> | undefined;
  let builtAt = 0;
  const recipe: SolanaRecipe<SolanaBuyParams> = {
    ...plan.recipe,
    type: 'solana',
    buildSteps: async ({ intermediary, amount }) => {
      finalSwap = await buildJupiterSwap({
        intermediary,
        amount,
        input: SOLANA_USDC,
        output,
      });
      builtAt = Date.now();

      return finalSwap.prepared;
    },
  };

  const preview = await exec.preview({ ...plan, recipe });
  const swap = finalSwap;
  const { networkFee } = preview.execution.details;

  if (!swap || swap.inputAmount !== preview.spendable || networkFee == null) {
    throw new Error('Could not confirm the final swap amount and network fee');
  }

  if (builtAt + PREVIEW_VALIDITY_MS <= Date.now()) {
    throw new Error(
      'The swap preview expired while preparing; get a new quote',
    );
  }

  return {
    preview,
    outputMint: output.mint,
    estimatedOutput: swap.estimatedOutput,
    minimumOutput: swap.minimumOutput,
    recipientAta: swap.recipientAta,
    networkFee,
    expiresAt: builtAt + PREVIEW_VALIDITY_MS,
    route: swap.route,
  };
};
