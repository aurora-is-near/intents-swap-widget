import { CHAIN_BASE_TOKENS } from '@/constants/chains';
import type { Context } from '@/machine/context';

// True when the user is spending their entire balance of the token that also
// pays for gas on that chain, which leaves nothing to cover the network fee.
// Intent balances are excluded as those transfers are signed, not broadcast.
const isGasTokenAmountAtLeast = (
  ctx: Context,
  thresholdPercent: bigint,
): boolean => {
  const token = ctx.sourceToken;

  if (
    !token ||
    token.isIntent ||
    !ctx.sourceTokenBalance ||
    CHAIN_BASE_TOKENS[token.blockchain] !== token.symbol
  ) {
    return false;
  }

  try {
    const amount = BigInt(ctx.sourceTokenAmount);
    const balance = BigInt(ctx.sourceTokenBalance);

    return amount <= balance && amount * 100n >= balance * thresholdPercent;
  } catch {
    return false;
  }
};

export const isFullGasTokenAmount = (ctx: Context): boolean =>
  isGasTokenAmountAtLeast(ctx, 100n);

export const isNearlyFullGasTokenAmount = (ctx: Context): boolean =>
  isGasTokenAmountAtLeast(ctx, 95n);
