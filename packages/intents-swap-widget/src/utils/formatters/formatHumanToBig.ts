import { parseUnits } from 'ethers';

import { isValidFloat } from '../checkers/isValidFloat';

export const formatHumanToBig = (
  amount: string,
  decimals: number | undefined,
) => {
  if (!isValidFloat(amount) || !decimals) {
    return '';
  }

  return parseUnits(amount, decimals).toString();
};
