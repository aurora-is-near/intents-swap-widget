import { Chains } from '../../types';
import { isEvmAddress } from './isEvmAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';
import { isTonAddress } from './isTonAddress';
import { isTronAddress } from './isTronAddress';
import { isXrpAddress } from './isXrpAddress';
import { isCardanoAddress } from './isCardanoAddress';
import { isBtcAddress } from './isBtcAddress';
import { isLtcAddress } from './isLtcAddress';
import { isDogeAddress } from './isDogeAddress';
import { isZecAddress } from './isZecAddress';
import { isSuiAddress } from './isSuiAddress';
import { EVM_CHAINS } from '../../constants';

const getSupportedChainsFromAddress = (address: string): readonly Chains[] => {
  if (isSolanaAddress(address)) {
    return ['sol'];
  }

  if (isNearAddress(address)) {
    return ['near'];
  }

  if (isTonAddress(address)) {
    return ['ton'];
  }

  if (isTronAddress(address)) {
    return ['tron'];
  }

  if (isXrpAddress(address)) {
    return ['xrp'];
  }

  if (isCardanoAddress(address)) {
    return ['cardano'];
  }

  if (isBtcAddress(address)) {
    return ['btc'];
  }

  if (isLtcAddress(address)) {
    return ['ltc'];
  }

  if (isDogeAddress(address)) {
    return ['doge'];
  }

  if (isZecAddress(address)) {
    return ['zec'];
  }

  if (isSuiAddress(address)) {
    return ['sui'];
  }

  if (isEvmAddress(address)) {
    return EVM_CHAINS;
  }

  // Default to EVM chains if unable to determine based on address format.
  return EVM_CHAINS;
};

export const getSupportedChains = ({
  walletAddress,
  walletSupportedChains,
}: {
  walletAddress?: string;
  walletSupportedChains?: readonly Chains[];
}) => {
  if (walletSupportedChains?.length) {
    return walletSupportedChains;
  }

  if (!walletAddress) {
    return EVM_CHAINS;
  }

  return getSupportedChainsFromAddress(walletAddress);
};
