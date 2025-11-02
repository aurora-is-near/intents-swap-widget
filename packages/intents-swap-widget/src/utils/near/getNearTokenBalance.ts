import { getNearNep141Balance } from './getNearNep141Balance';
import type { Token } from '@/types/token';

export const getNearTokenBalance = async (
  token: Token,
  signedAccountId: string,
  rpcUrls: string[],
): Promise<string> => {
  if (!token.contractAddress) {
    return '0';
  }

  const balance = await getNearNep141Balance({
    tokenAddress: token.contractAddress,
    accountId: signedAccountId,
    rpcUrls,
  });

  return balance ? balance.toString() : '0';
};
