import {
  type Chains,
  isBtcAddress,
  isCardanoAddress,
  isDogeAddress,
  isEvmAddress,
  isLtcAddress,
  isNearAddress,
  isSolanaAddress,
  isStellarAddress,
  isSuiAddress,
  isTonAddress,
  isTronAddress,
  isXrpAddress,
  isZecAddress,
} from '@aurora-is-near/intents-swap-widget';

export const validateAddressByChain = (
  chain: Chains,
  address: string,
): boolean | null => {
  switch (chain) {
    case 'eth':
    case 'arb':
    case 'bera':
    case 'base':
    case 'gnosis':
    case 'avax':
    case 'op':
    case 'pol':
    case 'monad':
    case 'bsc':
      return !!isEvmAddress(address);
    case 'btc':
      return !!isBtcAddress(address);
    case 'doge':
      return !!isDogeAddress(address);
    case 'stellar':
      return !!isStellarAddress(address);
    case 'cardano':
      return !!isCardanoAddress(address);
    case 'ltc':
      return !!isLtcAddress(address);
    case 'near':
      return !!isNearAddress(address);
    case 'sol':
      return !!isSolanaAddress(address);
    case 'sui':
      return !!isSuiAddress(address);
    case 'xrp':
      return !!isXrpAddress(address);
    case 'zec':
      return !!isZecAddress(address);
    case 'ton':
      return !!isTonAddress(address);
    case 'tron':
      return !!isTronAddress(address);
    default:
      return null;
  }
};
