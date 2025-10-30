import type { Context } from '@/machine/context';

export const isSendAddressForbidden = (ctx: Context) =>
  !!ctx.targetToken?.isIntent;
