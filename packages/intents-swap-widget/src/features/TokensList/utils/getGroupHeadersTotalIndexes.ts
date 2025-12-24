import type { AnyListGroup } from '../types';

/**
 * Get positions of all group headers in the combined list
 *
 * @param tokensList - The list of tokens (grouped or ungrouped)
 * @returns List of positions of all group headers in the combined list
 */
export const getGroupHeadersTotalIndexes = (tokensList: AnyListGroup) => {
  return tokensList.reduce((acc, group, index) => {
    if (index === 0 && group.label) {
      return [0];
    }

    if (group.tokens && index < tokensList.length - 1) {
      return [...acc, (acc[acc.length - 1] ?? 0) + group.tokens.length + 1];
    }

    return acc;
  }, [] as number[]);
};
