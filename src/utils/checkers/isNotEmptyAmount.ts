import type { TokenBalance } from '@/types/token';

import { isValidFloat } from './isValidFloat';
import { isOnlyZerosAndDot } from './isOnlyZerosAndDot';

export const isNotEmptyAmount = (amount: TokenBalance) => {
  return (
    !!amount &&
    amount.trim() !== '' &&
    isValidFloat(amount) &&
    !isOnlyZerosAndDot(amount)
  );
};
