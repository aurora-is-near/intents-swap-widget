import { useMemo } from 'react';
import { EVM_CHAINS } from '../constants';
import { useUnsafeSnapshot } from '../machine';
import { Chains } from '../types';
import { isEvmAddress } from '../utils/chains/isEvmAddress';
import { isNearAddress } from '../utils/chains/isNearAddress';
import { isSolanaAddress } from '../utils/chains/isSolanaAddress';
import { useConfig } from '../config';
import { isTonAddress } from '../utils/chains/isTonAddress';
import { isTronAddress } from '../utils/chains/isTronAddress';
import { isXrpAddress } from '../utils/chains/isXrpAddress';
import { isCardanoAddress } from '../utils/chains/isCardanoAddress';
import { isBtcAddress } from '../utils/chains/isBtcAddress';
import { isLtcAddress } from '../utils/chains/isLtcAddress';
import { isDogeAddress } from '../utils/chains/isDogeAddress';
import { isZecAddress } from '../utils/chains/isZecAddress';
import { isSuiAddress } from '../utils/chains/isSuiAddress';

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

export const useSupportedChains = () => {
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const { walletSupportedChains } = useConfig();

  const supportedChains = useMemo(() => {
    if (walletSupportedChains?.length) {
      return walletSupportedChains;
    }

    if (!walletAddress) {
      return [];
    }

    return getSupportedChainsFromAddress(walletAddress);
  }, [walletAddress]);

  return { supportedChains };
};
