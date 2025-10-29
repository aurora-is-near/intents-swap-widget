import { Contract, JsonRpcProvider } from 'ethers';

import type { Token } from '@/types/token';

export const getEvmTokenBalance = async (
  token: Token,
  wallet: string,
  rpcUrl: string,
) => {
  const provider = new JsonRpcProvider(rpcUrl);
  const erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  if (!token.contractAddress) {
    return '0';
  }

  const tokenContract = new Contract(token.contractAddress, erc20Abi, provider);

  if (!tokenContract.balanceOf) {
    return '0';
  }

  const balance: string = await tokenContract.balanceOf(wallet);

  return balance.toString();
};
