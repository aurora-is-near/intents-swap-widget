import { useMemo } from 'react';
import { EVM_CHAINS } from '../constants';
import { useUnsafeSnapshot } from '../machine';
import { Chains } from '../types';
import { isEvmAddress } from '../utils/evm/isEvmAddress';
import { isNearAddress } from '../utils/near/isNearAddress';
import { isSolanaAddress } from '../utils/solana/isSolanaAddress';
import { useConfig } from '../config';
import { isTonAddress } from '../utils/ton/isTonAddress';

const getSupportedChainsFromAddress = (address: string): readonly Chains[] => {
  if (isSolanaAddress(address)) {
    return ['sol'];
  }

  if (isEvmAddress(address)) {
    return EVM_CHAINS;
  }

  if (isNearAddress(address)) {
    return ['near'];
  }

  if (isTonAddress(address)) {
    return ['ton'];
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
