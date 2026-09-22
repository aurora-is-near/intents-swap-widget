import type { SolanaRecipe, StepsPlan } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { PREVIEW_VALIDITY_MS, SOLANA_USDC } from './constants';
import type { SolanaToken } from './constants';
import { buildJupiterSwap } from './jupiter';
import { getSolanaConnection, validateMints } from './client';
import type { SolanaSpendQuote } from './spend';

export type SolanaSellParams = { mint: string };

/**
 * Sells the whole balance of a Connect-account token for USDC, inside the
 * same account. The intermediary already holds the token, so this is a
 * steps-only execution: Connect's fee comes out of the USDC the swap
 * produces, and the swap input is never reduced by it.
 */
export const buildSolanaSellPlan = ({
  token,
  amount,
}: {
  token: SolanaToken;
  /** Atomic amount of `token` to sell — the full balance. */
  amount: string;
}): StepsPlan<SolanaSellParams> => {
  const symbol = token.symbol.toLowerCase();
  const recipe: SolanaRecipe<SolanaSellParams> = {
    id: `solana-sell-${symbol}`,
    intent: `solana_sell_${symbol}`,
    title: `Sell ${token.symbol} to USDC in your Connect account`,
    type: 'solana',
    flow: 'steps-only',
    destination: {
      chain: 'sol',
      assetId: SOLANA_USDC.assetId,
      tokenAddress: SOLANA_USDC.mint,
    },
    buildSteps: async ({ intermediary, amount: input }) =>
      (
        await buildJupiterSwap({
          intermediary,
          amount: input,
          input: token,
          output: SOLANA_USDC,
        })
      ).prepared,
  };

  return {
    recipe,
    params: { mint: token.mint },
    amount,
    previewTtlMs: PREVIEW_VALIDITY_MS,
  };
};

/**
 * Previews a sale. The swap input does not depend on the fee, so Jupiter is
 * asked once, up front, for the known intermediary: that build feeds the
 * SDK's steps AND sets the fee cap (`maxNetworkFee`) before planning, so the
 * SDK records it in the execution's metadata and re-checks it before signing
 * — including on a cross-session resume, where a closure could not survive.
 */
export const previewSolanaSell = async (
  exec: Pick<UseExecutionResult, 'previewSteps'>,
  plan: StepsPlan<SolanaSellParams>,
  token: SolanaToken,
  /** The Connect Solana account that holds `token`. */
  intermediary: string,
): Promise<SolanaSpendQuote<SolanaSellParams>> => {
  await validateMints(getSolanaConnection(), [token, SOLANA_USDC]);

  let swap = await buildJupiterSwap({
    intermediary,
    amount: plan.amount,
    input: token,
    output: SOLANA_USDC,
  });

  let builtAt = Date.now();

  // Leave at least one atomic unit of the guaranteed output for the user.
  const minimumOutput = BigInt(swap.minimumOutput);

  if (minimumOutput <= 1n) {
    throw new Error(
      `${token.symbol} balance is too small to sell: Jupiter guarantees no USDC output`,
    );
  }

  const recipe: SolanaRecipe<SolanaSellParams> = {
    ...plan.recipe,
    type: 'solana',
    buildSteps: async ({ intermediary: owner, amount }) => {
      // Reused for the SDK's own build at the same amount and account; any
      // other request means the SDK sized the steps differently.
      if (owner !== intermediary || amount !== swap.inputAmount) {
        swap = await buildJupiterSwap({
          intermediary: owner,
          amount,
          input: token,
          output: SOLANA_USDC,
        });
        builtAt = Date.now();
      }

      return swap.prepared;
    },
  };

  const preview = await exec.previewSteps({
    ...plan,
    recipe,
    maxNetworkFee: (minimumOutput - 1n).toString(),
  });

  if (swap.inputAmount !== preview.spendable) {
    throw new Error('Could not confirm the swap input and network fee');
  }

  if (builtAt + PREVIEW_VALIDITY_MS <= Date.now()) {
    throw new Error(
      'The swap preview expired while preparing; get a new quote',
    );
  }

  return {
    preview,
    receive: swap.estimatedOutput,
    minimumReceive: swap.minimumOutput,
    networkFee: preview.networkFee,
    route: swap.route,
    expiresAt: Math.min(
      builtAt + PREVIEW_VALIDITY_MS,
      Date.parse(preview.plan.prepared!.expiresAt),
    ),
  };
};
