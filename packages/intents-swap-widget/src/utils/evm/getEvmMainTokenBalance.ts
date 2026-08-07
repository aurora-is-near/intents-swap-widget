import { getEvmRpcProvider } from './getEvmRpcProvider';

export const getEvmMainTokenBalance = async (
  wallet: string,
  rpcUrl: string,
) => {
  const provider = getEvmRpcProvider(rpcUrl);
  const balance = await provider.getBalance(wallet);

  return balance.toString();
};
