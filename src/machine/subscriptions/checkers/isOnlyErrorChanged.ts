import type { ContextChange } from '@/machine/context';

import { isErrorChanged } from './isErrorChanged';

export const isOnlyErrorChanged = (changes: ContextChange[]) => {
  return Object.keys(changes).length === 1 && isErrorChanged(changes);
};
