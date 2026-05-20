import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import type { Token } from '@/types/token';

export const isAuroraRecipient = (
  targetToken: Pick<Token, 'isIntent' | 'blockchain'>,
): boolean => isAuroraToken(targetToken) && !targetToken.isIntent;
