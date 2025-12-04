import type { Context } from '@/machine/context';
import { isNearAddress } from '@/utils/near/isNearAddress';

export const isSendAddressValid = (ctx: Context): boolean => {
  // Intent tokens don't need a send address
  if (ctx.targetToken?.isIntent === true && !ctx.sendAddress) {
    return true;
  }

  // Non-intent tokens require a send address
  if (ctx.targetToken?.isIntent === false && !!ctx.sendAddress) {
    // For NEAR blockchain, validate address format
    if (ctx.targetToken.blockchain === 'near') {
      return isNearAddress(ctx.sendAddress);
    }
    return true;
  }

  return false;
};
