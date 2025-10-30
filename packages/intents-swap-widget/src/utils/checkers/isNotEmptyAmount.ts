import { isValidFloat } from './isValidFloat';
import { isOnlyZerosAndDot } from './isOnlyZerosAndDot';
import type { TokenBalance } from '@/types/token';

export const isNotEmptyAmount = (amount: TokenBalance) => {
  return (
    !!amount &&
    amount.trim() !== '' &&
    isValidFloat(amount) &&
    !isOnlyZerosAndDot(amount)
  );
};
