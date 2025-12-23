import type { Token } from '@/types/token';

export const useListState = (tokens: ReadonlyArray<Token>, search: string) => {
  if (tokens.length === 0 && search) {
    return 'EMPTY_SEARCH';
  }

  if (tokens.length === 0 && !search) {
    return 'NO_TOKENS';
  }

  return 'HAS_TOKENS';
};
