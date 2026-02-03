import { isAsyncSendAddressValidationError } from '@/machine/errors';
import { isNearAddress } from '@/utils/chains/isNearAddress';
import type { Context } from '@/machine/context';

export const isSendAddressValid = (ctx: Context): boolean => {
  // Intent tokens don't need a send address
  if (ctx.targetToken?.isIntent === true && !ctx.sendAddress) {
    return true;
  }

  // Non-intent tokens require a send address
  if (ctx.targetToken?.isIntent === false && !!ctx.sendAddress) {
    // For NEAR blockchain, validate address format
    if (ctx.targetToken.blockchain === 'near') {
      return (
        isNearAddress(ctx.sendAddress) &&
        (!ctx.error || !isAsyncSendAddressValidationError(ctx.error))
      );
    }

    return true;
  }

  return false;
};
