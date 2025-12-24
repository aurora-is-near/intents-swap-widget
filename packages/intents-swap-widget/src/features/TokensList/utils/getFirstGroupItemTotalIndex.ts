import type { AnyListGroup } from '../types';

/**
 * Get index across all groups of the first item in a given group
 *
 * @param tokensList - The list of tokens (grouped or ungrouped)
 * @param groupIndex - The index of the group
 * @returns The total index of the first item in the group
 */
export const getFirstGroupItemTotalIndex = (
  tokensList: AnyListGroup,
  groupIndex: number,
) => {
  const tokensGroupIndex = groupIndex % 2 !== 0 ? groupIndex : 0;

  if (tokensGroupIndex <= 1) {
    return tokensGroupIndex;
  }

  return (
    tokensList.reduce((acc, group, index) => {
      return (
        acc +
        (group.tokens && index < tokensGroupIndex ? group.tokens.length + 1 : 0)
      );
    }, 0) + 1
  ); // +1 for current group's header
};
