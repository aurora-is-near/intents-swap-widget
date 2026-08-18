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

  // "Receive in my wallet" is not user input to throw away: it mirrors the
  // connected wallet, so returning to the form (from the success screen, say)
  // should keep it. Clearing it here would also suppress the auto-fill in
  // `isSendAddressAsConnected`, which ignores batches that touch `sendAddress`.
  const keepSendAddress =
    !payload.clearWalletAddress &&
    !!ctx.walletAddress &&
    ctx.sendAddress === ctx.walletAddress;

  if (keepDepositType && ctx.isDepositFromExternalWallet) {
    // persist refund to and receive in addresses
  } else {
    ctx.refundToAddress = undefined;

    if (!keepSendAddress) {
      ctx.sendAddress = undefined;
    }
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
