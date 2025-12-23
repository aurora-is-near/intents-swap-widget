import type { AnyListGroup } from '../types';

/**
 * Get the token by total index across all groups and headers
 *
 * @param tokensList - The list of tokens (grouped or ungrouped)
 * @param totalIndex - The total index of the token
 * @returns The token
 */
export const getTokenByTotalIndex = (
  tokensList: AnyListGroup,
  totalIndex: number,
) => {
  const flatList = tokensList.flatMap((group) =>
    'label' in group ? [null] : group.tokens,
  );

  return flatList[totalIndex];
};
