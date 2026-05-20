import type { Token } from '@/types/token';

export const isAuroraToken = (token: Pick<Token, 'blockchain'>): boolean =>
  token.blockchain === 'aurora';
