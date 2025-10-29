import { JsonRpcProvider } from 'ethers';

export const getEvmMainTokenBalance = async (
  wallet: string,
  rpcUrl: string,
) => {
  const provider = new JsonRpcProvider(rpcUrl);
  const balance = await provider.getBalance(wallet);

  return balance.toString();
};
