import type { AnyListGroup } from '../types';

/**
 * Get the total number of RENDERED items in the list (including group headers)
 *
 * @param tokensList - The list of tokens (grouped or ungrouped)
 * @returns The total number of items in the list
 */
export const getListItemsTotalCount = (tokensList: AnyListGroup) => {
  return tokensList.reduce(
    (acc, group) => acc + (group.tokens?.length ?? 0) + (group.label ? 1 : 0),
    0,
  );
};
