import type { VListHandle } from 'virtua';

export const getResetInitialScrollFn = (
  listRef: VListHandle | null,
  focusedIndex: number,
) => {
  return (index: number) => {
    if (focusedIndex <= 1 || index <= 1) {
      listRef?.scrollToIndex(0, {
        align: 'start',
        offset: -999,
      });
    }
  };
};
