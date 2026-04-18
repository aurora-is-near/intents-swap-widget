import { isBtcAddress } from '../chains/isBtcAddress';
import { isEvmAddress } from '../chains/isEvmAddress';
import { isCardanoAddress } from '../chains/isCardanoAddress';
import { isDogeAddress } from '../chains/isDogeAddress';
import { isTronAddress } from '../chains/isTronAddress';
import { isXrpAddress } from '../chains/isXrpAddress';
import { isNearAddress } from '../chains/isNearAddress';
import { isLtcAddress } from '../chains/isLtcAddress';
import { isStellarAddress } from '../chains/isStellarAddress';
import { isSuiAddress } from '../chains/isSuiAddress';
import { isSolanaAddress } from '../chains/isSolanaAddress';
import { isTonAddress } from '../chains/isTonAddress';
import { isZecAddress } from '../chains/isZecAddress';

import { Chains } from '@/types';

export const isValidChainAddress = (
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
