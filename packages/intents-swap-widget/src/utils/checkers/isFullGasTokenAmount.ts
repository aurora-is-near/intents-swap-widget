import { parseUnits } from 'ethers';

import { CHAIN_BASE_TOKENS } from '@/constants/chains';
import type { Context } from '@/machine/context';

// True when the user is spending their entire balance of the token that also
// pays for gas on that chain, which leaves nothing to cover the network fee.
// Intent balances are excluded as those transfers are signed, not broadcast.
export const isFullGasTokenAmount = (ctx: Context): boolean => {
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
    return (
      parseUnits(ctx.sourceTokenAmount, token.decimals) ===
      BigInt(ctx.sourceTokenBalance)
    );
  } catch {
    return false;
  }
};
