import type { Context } from '@/machine/context';
import type { SwapConfidentialMode } from '@/types';

export type ConfidentialModeSetPayload = SwapConfidentialMode;

export const confidentialModeSet = (
  ctx: Context,
  payload: ConfidentialModeSetPayload,
): void => {
  ctx.confidentialMode = payload;
};
