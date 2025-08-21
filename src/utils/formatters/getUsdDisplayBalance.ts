import { formatUnits } from 'ethers';

import type { Token, TokenBalance } from '@/types/token';

import { formatUsdAmount } from './formatUsdAmount';

export const getUsdDisplayBalance = (balance: TokenBalance, token: Token) => {
  const balanceParsed = balance ? formatUnits(balance, token.decimals) : '0';
  const usdBalance = balance
    ? formatUsdAmount(parseFloat(balanceParsed) * token.price)
    : '$0.00';

  return usdBalance === '$0.00' ? '$0.01' : usdBalance;
};
