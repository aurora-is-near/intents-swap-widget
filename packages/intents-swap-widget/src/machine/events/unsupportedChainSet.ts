import type { Context } from '@/machine/context';
import type { Chains } from '@/types/chain';

export type UnsupportedChainSetPayload = Chains | null;

export const unsupportedChainSet = (
  ctx: Context,
  payload: UnsupportedChainSetPayload,
): void => {
  ctx.unsupportedChain = payload;
};
