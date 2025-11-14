import type { Machine } from '@/machine';
import type { Context } from '@/machine/context';

export const reset = (ctx: Context, _payload: null, m: Machine) => {
  ctx.sourceToken = undefined;
  ctx.sourceTokenBalance = undefined;
  ctx.sourceTokenAmount = '';

  ctx.targetToken = undefined;
  ctx.targetTokenAmount = '';

  ctx.walletAddress = undefined;
  ctx.sendAddress = undefined;
  ctx.isDepositFromExternalWallet = false;
  ctx.externalDepositTxReceived = undefined;
  ctx.error = null;

  ctx.quote = undefined;
  ctx.quoteStatus = 'idle';
  ctx.transferStatus = { status: 'idle' };

  return m;
};
