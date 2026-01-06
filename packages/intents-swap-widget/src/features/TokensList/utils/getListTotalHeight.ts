import { LIST_SECTION_HEADER_HEIGHT, TOKEN_ITEM_HEIGHT } from '../constants';
import type { AnyListGroup } from '../types';

const getTokensTotalCount = (tokensList: AnyListGroup) => {
  return tokensList.reduce(
    (acc, group) => acc + (group.tokens?.length ?? 0),
    0,
  );
};

/**
 * Get the total height of the list
 *
 * @param tokensList - The list of tokens (grouped or ungrouped)
 * @returns The total height of the list
 */
export const getListTotalHeight = (tokensList: AnyListGroup) => {
  const tokensCount = getTokensTotalCount(tokensList);

  return tokensCount
    ? tokensCount * TOKEN_ITEM_HEIGHT +
        tokensList.filter((group) => !!group.label).length *
          LIST_SECTION_HEADER_HEIGHT
    : TOKEN_ITEM_HEIGHT * 2;
};
