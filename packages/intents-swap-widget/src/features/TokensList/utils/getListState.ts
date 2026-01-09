import type { Token } from '@/types/token';

/**
 * Get the state of the list
 *
 * @param tokens - The list of tokens (grouped or ungrouped)
 * @param search - The search string
 * @returns The state of the list: 'EMPTY_SEARCH', 'NO_TOKENS', 'HAS_TOKENS'
 */
export const getListState = (tokens: ReadonlyArray<Token>, search: string) => {
  if (tokens.length) {
    return 'HAS_TOKENS';
  }

  return !search ? 'NO_TOKENS' : 'EMPTY_SEARCH';
};
