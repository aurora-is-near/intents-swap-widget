import { TOKEN_ITEM_HEIGHT } from '../constants';
import type { AnyListGroup } from '../types';

const getTokensTotalCount = (tokensList: AnyListGroup) => {
  return tokensList.reduce(
    (acc, group) => acc + (group.tokens?.length ?? 0),
    0,
  );
};

export const getListTotalHeight = (tokensList: AnyListGroup) => {
  const tokensCount = getTokensTotalCount(tokensList);

  return tokensCount
    ? tokensCount * TOKEN_ITEM_HEIGHT +
        tokensList.filter((group) => !!group.label).length * 62
    : TOKEN_ITEM_HEIGHT * 2;
};
