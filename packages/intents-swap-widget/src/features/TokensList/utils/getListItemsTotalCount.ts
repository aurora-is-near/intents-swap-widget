import type { AnyListGroup } from '../types';

export const getListItemsTotalCount = (tokensList: AnyListGroup) => {
  return tokensList.reduce(
    (acc, group) => acc + (group.tokens?.length ?? 0) + (group.label ? 1 : 0),
    0,
  );
};
