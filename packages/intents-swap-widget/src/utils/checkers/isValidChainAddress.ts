import { Chains } from '@/types';
import { isEvmChain } from '@/utils/evm/isEvmChain';
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
import { isDashAddress } from '../chains/isDashAddress';
import { isStarknetAddress } from '../chains/isStarknetAddress';
import { isBchAddress } from '../chains/isBchAddress';
import { isAleoAddress } from '../chains/isAleoAddress';

/**
 * Returns `true`/`false` for a known chain, or `null` when the chain has no
 * address validator. Callers treat `null` as invalid, so every chain listed
 * in `CHAINS` must be handled here.
 */
export const isValidChainAddress = (
  chain: Chains,
  rawAddress: string,
): boolean | null => {
  // Pasted addresses frequently carry surrounding whitespace or a newline.
  const address = rawAddress.trim();

  // All EVM chains (and EVM-addressed L2s like Hypercore) share one format.
  if (isEvmChain(chain) || chain === 'hypercore') {
    return isEvmAddress(address);
  }

  switch (chain) {
    case 'btc':
      return isBtcAddress(address);
    case 'doge':
      return isDogeAddress(address);
    case 'stellar':
      return isStellarAddress(address);
    case 'cardano':
      return isCardanoAddress(address);
    case 'ltc':
      return isLtcAddress(address);
    case 'near':
      return isNearAddress(address);
    case 'sol':
      return isSolanaAddress(address);
    case 'sui':
      return isSuiAddress(address);
    case 'xrp':
      return isXrpAddress(address);
    case 'zec':
      return isZecAddress(address);
    case 'ton':
      return isTonAddress(address);
    case 'tron':
      return isTronAddress(address);
    case 'dash':
      return isDashAddress(address);
    case 'starknet':
      return isStarknetAddress(address);
    case 'bch':
      return isBchAddress(address);
    case 'aleo':
      return isAleoAddress(address);
    default:
      return null;
  }
};
