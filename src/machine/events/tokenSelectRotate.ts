import type { Context } from '@/machine/context';

export const tokenSelectRotate = (ctx: Context): void => {
  const temp = ctx.sourceToken;
  const tempAmount = ctx.sourceTokenAmount;

  ctx.sourceToken = ctx.targetToken;
  ctx.sourceTokenAmount = ctx.targetTokenAmount;

  ctx.targetToken = temp;
  ctx.targetTokenAmount = tempAmount;
};
