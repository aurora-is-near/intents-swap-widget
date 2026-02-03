import { useMemo } from 'react';
import { useUnsafeSnapshot } from '../machine';
import { useConfig } from '../config';
import { getSupportedChains } from '../utils/chains/getSupportedChains';

export const useSupportedChains = () => {
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const { walletSupportedChains } = useConfig();

  const supportedChains = useMemo(() => {
    return getSupportedChains({ walletAddress, walletSupportedChains });
  }, [walletAddress, walletSupportedChains]);

  return { supportedChains };
};
