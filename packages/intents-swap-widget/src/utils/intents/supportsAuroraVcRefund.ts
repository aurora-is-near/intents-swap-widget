import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import type { Token } from '@/types/token';

type Args = {
  sourceToken: Pick<Token, 'isIntent' | 'blockchain'>;
  targetToken: Pick<Token, 'isIntent' | 'blockchain'>;
};

export const supportsAuroraVcRefund = ({
  sourceToken,
  targetToken,
}: Args): boolean =>
  isAuroraToken(targetToken) &&
  (sourceToken.isIntent || isAuroraToken(sourceToken));
