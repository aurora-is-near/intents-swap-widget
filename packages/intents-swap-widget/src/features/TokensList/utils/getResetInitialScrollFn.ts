import type { VListHandle } from 'virtua';

/**
 * Get the function to reset the initial scroll position to the top
 *
 * @param listRef - The reference to the list
 * @param focusedIndex - The index of the focused item
 * @returns The function to reset the initial scroll position
 */
export const getResetInitialScrollFn = (
  listRef: VListHandle | null,
  focusedIndex: number,
) => {
  return (index: number) => {
    if (focusedIndex <= 1 || index <= 1) {
      listRef?.scrollToIndex(0, {
        align: 'start',
        offset: -999, // just a big number to ensure top of the list
      });
    }
  };
};
