import type { Machine } from '@/machine';
import type { Context } from '@/machine/context';

export type ResetPayload = {
  keepDepositType?: boolean;
  keepSelectedTokens?: boolean;
  clearWalletAddress: boolean;
};

export const reset = (ctx: Context, payload: ResetPayload, m: Machine) => {
  ctx.sourceTokenBalance = undefined;
  ctx.sourceTokenAmount = '';
  ctx.targetTokenAmount = '';

  ctx.externalDepositTxReceived = undefined;

  if (!payload.keepDepositType) {
    ctx.isDepositFromExternalWallet = false;
  }

  if (
    payload.keepDepositType &&
    ctx.isDepositFromExternalWallet &&
    !ctx.walletAddress
  ) {
    // persist refund to and receive in addresses
  } else {
    ctx.refundToAddress = undefined;
    ctx.sendAddress = undefined;
  }

  ctx.error = null;
  ctx.unsupportedChain = null;

  ctx.quote = undefined;
  ctx.quoteStatus = 'idle';
  ctx.transferStatus = { status: 'idle' };

  if (!payload.keepSelectedTokens) {
    ctx.sourceToken = undefined;
    ctx.targetToken = undefined;
    ctx.sourceTokenDefault = undefined;
    ctx.targetTokenDefault = undefined;
  }

  if (payload.clearWalletAddress) {
    ctx.walletAddress = undefined;
  }

  return m;
};
