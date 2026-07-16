import type { ContextChange } from '@/machine/context';

export const isOnlyBalanceChanged = (changes: ContextChange[]) => {
  const keys = changes.map((change) => change?.key).filter(Boolean);

  return keys.length > 0 && keys.every((key) => key === 'sourceTokenBalance');
};
