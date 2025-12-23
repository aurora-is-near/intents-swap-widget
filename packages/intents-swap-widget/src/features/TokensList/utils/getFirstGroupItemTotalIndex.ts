import type { AnyListGroup } from '../types';

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
