import { formatUnits } from 'ethers';

import type { TokenBalance } from '@/types/token';

export const getBalancePortion = (
  balance: TokenBalance,
  decimals: number,
  div: number,
) => {
  const fullAmount = BigInt(balance ?? '0') / BigInt(div);

  return fullAmount > 0 ? formatUnits(fullAmount, decimals) : '';
};
