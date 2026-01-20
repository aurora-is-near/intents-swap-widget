import { CHAINS } from '@aurora-is-near/intents-swap-widget';

export const getChainName = (chainId: string): string =>
  CHAINS.find((chain) => chain.id === chainId)?.label ??
  `${chainId?.charAt(0).toUpperCase()}${chainId?.slice(1)}`;
