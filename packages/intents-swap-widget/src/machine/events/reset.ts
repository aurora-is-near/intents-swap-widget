import type { Context } from '@/machine/context';

export const reset = (ctx: Context) => {
  ctx.sourceToken = undefined;
  ctx.sourceTokenBalance = undefined;
  ctx.sourceTokenAmount = '';

  ctx.targetToken = undefined;
  ctx.targetTokenAmount = '';

  ctx.walletAddress = undefined;
  ctx.sendAddress = undefined;
  ctx.isDepositFromExternalWallet = false;
  ctx.externalDepositTxReceived = false;
  ctx.error = null;

  ctx.quote = undefined;
  ctx.quoteStatus = 'idle';
  ctx.transferStatus = { status: 'idle' };
};
