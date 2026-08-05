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

  // Only worth keeping while there is no wallet to deposit from: there the QR
  // flow is the only usable one, so a reset has nothing to return to and would
  // just throw away the addresses the user typed by hand. With a wallet
  // connected the default deposit is available again, so returning here (from
  // the success screen, say) should leave the QR toggle off.
  const keepDepositType = payload.keepDepositType && !ctx.walletAddress;

  if (!keepDepositType) {
    ctx.isDepositFromExternalWallet = false;
  }

  if (keepDepositType && ctx.isDepositFromExternalWallet) {
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
