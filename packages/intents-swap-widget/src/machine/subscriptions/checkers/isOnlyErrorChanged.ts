import { isErrorChanged } from './isErrorChanged';
import type { ContextChange } from '@/machine/context';

export const isOnlyErrorChanged = (changes: ContextChange[]) => {
  return Object.keys(changes).length === 1 && isErrorChanged(changes);
};
