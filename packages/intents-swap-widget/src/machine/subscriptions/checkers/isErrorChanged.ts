import type { ContextChange } from '@/machine/context';

export const isErrorChanged = (changes: ContextChange[]) => {
  return changes.some((change) => change?.key === 'error');
};
