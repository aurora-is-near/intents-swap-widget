import type { DeepReadonly } from '@/types/utils';

import type { Context } from '../context';

const PARTICIPATE_WIDGET_REGEX = /^lp-\d+\.sale-factory(-dev)?\.near$/;

export const getIsParticipateWidget = (ctx: DeepReadonly<Context>): boolean => {
  return !!(ctx.sendAddress && PARTICIPATE_WIDGET_REGEX.test(ctx.sendAddress));
};
