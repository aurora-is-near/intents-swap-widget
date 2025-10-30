import { formatUnits } from 'ethers';

import { isValidFloat } from '../checkers/isValidFloat';
import { isOnlyZerosAndDot } from '../checkers/isOnlyZerosAndDot';
import { trimDecimals } from './trimDecimals';

export const formatBigToHuman = (
  amount: string,
  decimals: number | undefined,
  decimalsLimit: number | false = 5,
) => {
  if (isOnlyZerosAndDot(amount)) {
    return amount;
  }

  if (!isValidFloat(amount) || !decimals) {
    return '';
  }

  const result = formatUnits(amount, decimals);
  const trimmed = decimalsLimit ? trimDecimals(result, decimalsLimit) : result;

  if (isOnlyZerosAndDot(trimmed)) {
    return '';
  }

  return trimmed;
};
