import type { Token } from '@/types/token';

type Options = {
  isIntent: boolean;
};

export const createFilterByIntents = (options: Options) => {
  const { isIntent } = options;

  return (token: Token) => {
    return isIntent ? token.isIntent : !token.isIntent;
  };
};
