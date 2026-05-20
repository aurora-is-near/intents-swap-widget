import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import type { Transaction } from '@/types/transaction';
import type { Token } from '@/types/token';

export const getDepositType = (
  sourceToken: Pick<Token, 'isIntent' | 'blockchain'>,
): Transaction['depositType'] =>
  sourceToken.isIntent || isAuroraToken(sourceToken)
    ? 'INTENTS'
    : 'ORIGIN_CHAIN';
