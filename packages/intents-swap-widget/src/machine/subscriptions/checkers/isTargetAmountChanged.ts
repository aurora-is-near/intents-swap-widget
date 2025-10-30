import type { Context, ContextChange } from '@/machine/context';

export const isTargetAmountChanged = (
  _ctx: Context,
  changes: ContextChange[],
) => {
  return changes.some((change) => change?.key === 'targetTokenAmount');
};
