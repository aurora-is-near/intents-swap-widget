import type { Context } from '@/machine/context';

export const isSendAddressValid = (ctx: Context): boolean => {
  return (
    (ctx.targetToken?.isIntent === true && !ctx.sendAddress) ||
    (ctx.targetToken?.isIntent === false && !!ctx.sendAddress)
  );
};
