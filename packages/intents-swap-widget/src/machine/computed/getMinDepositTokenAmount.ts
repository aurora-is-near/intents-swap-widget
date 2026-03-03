import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

// limit minimum deposit amount to 1 USD to avoid FLEX_INPUT quote failure
const MIN_DEPOSIT_USD_AMOUNT = 1;

export const getMinDepositTokenAmount = (
  ctx: DeepReadonly<Context>,
): string => {
  if (!ctx.sourceToken) {
    return '0';
  }

  const { price, decimals } = ctx.sourceToken;

  // Scale price to a BigInt to avoid floating-point imprecision.
  const priceFactor = BigInt(10 ** ctx.sourceToken.decimals);
  const priceBig = BigInt(Math.round(price * Number(priceFactor)));

  const numerator =
    BigInt(MIN_DEPOSIT_USD_AMOUNT) *
    BigInt(10) ** BigInt(decimals) *
    priceFactor;

  // BigInt ceiling division: (a + b - 1) / b
  return ((numerator + priceBig - 1n) / priceBig).toString();
};
