import type { Machine } from '@/machine';
import type { Context } from '@/machine/context';

export type ResetPayload = {
  clearWalletAddress: boolean;
};

export const reset = (ctx: Context, payload: ResetPayload, m: Machine) => {
  ctx.sourceToken = undefined;
  ctx.sourceTokenBalance = undefined;
  ctx.sourceTokenAmount = '';

  ctx.targetToken = undefined;
  ctx.targetTokenAmount = '';

  ctx.sendAddress = undefined;
  ctx.isDepositFromExternalWallet = false;
  ctx.externalDepositTxReceived = undefined;
  ctx.error = null;

  ctx.quote = undefined;
  ctx.quoteStatus = 'idle';
  ctx.transferStatus = { status: 'idle' };

  if (payload.clearWalletAddress) {
    ctx.walletAddress = undefined;
  }

  return m;
};
