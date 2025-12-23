import type { AnyListGroup } from '../types';

export const getTokenByTotalIndex = (
  tokensList: AnyListGroup,
  totalIndex: number,
) => {
  const flatList = tokensList.flatMap((group) =>
    'label' in group ? [null] : group.tokens,
  );

  return flatList[totalIndex];
};
