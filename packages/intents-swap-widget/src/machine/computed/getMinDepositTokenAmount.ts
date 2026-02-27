import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

// limit minimum deposit amount to 1 USD to avoid FLEX_INPUT quote failure
const MIN_DEPOSIT_USD_AMOUNT = 1;

export const getMinDepositTokenAmount = (
  ctx: DeepReadonly<Context>,
): number => {
  if (!ctx.sourceToken) {
    return 0;
  }

  return Math.ceil(
    (MIN_DEPOSIT_USD_AMOUNT / ctx.sourceToken.price) *
      10 ** ctx.sourceToken.decimals,
  );
};
