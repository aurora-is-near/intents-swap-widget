import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import type { Token } from '@/types/token';

type Args = {
  sourceToken: Pick<Token, 'blockchain'>;
  targetToken: Pick<Token, 'blockchain'>;
};

export const isAuroraSourceRefund = ({
  sourceToken,
  targetToken,
}: Args): boolean => isAuroraToken(sourceToken) && !isAuroraToken(targetToken);
