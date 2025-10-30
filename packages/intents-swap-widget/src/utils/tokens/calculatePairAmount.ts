import { isValidFloat } from '../checkers/isValidFloat';
import { formatHumanToBig } from '../formatters/formatHumanToBig';
import type { Token } from '@/types/token';

export const calculatePairAmount = (
  amount: string,
  source: Token | undefined,
  target: Token | undefined,
) => {
  // both tokens must be set to form a pair
  if (!isValidFloat(amount) || !source || !target) {
    return '';
  }

  // float - for math
  const calcAmountNum = (parseFloat(amount) * source.price) / target.price;
  // string - to display in an input
  const calcAmountStr = calcAmountNum.toFixed(5).toString();

  // big string - to use in a store
  return formatHumanToBig(calcAmountStr, target.decimals);
};
