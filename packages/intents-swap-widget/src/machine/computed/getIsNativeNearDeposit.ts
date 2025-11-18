import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';

export const getIsNativeNearDeposit = (ctx: DeepReadonly<Context>): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.targetToken.isIntent &&
    !ctx.sourceToken.isIntent &&
    ctx.sourceToken?.assetId === NATIVE_NEAR_DUMB_ASSET_ID &&
    ctx.targetToken?.assetId === WNEAR_ASSET_ID
  );
};
