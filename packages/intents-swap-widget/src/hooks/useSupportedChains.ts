import { useMemo } from 'react';
import { useUnsafeSnapshot } from '../machine';
import { useConfig } from '../config';
import { getSupportedChains } from '../utils/chains/getSupportedChains';
import { useWalletAddressForToken } from './useWalletAddressForToken';

export const useSupportedChains = () => {
  const {
    ctx: { sourceToken, walletAddress: machineWalletAddress },
  } = useUnsafeSnapshot();

  const { connectedWallets, walletSupportedChains } = useConfig();
  const { walletAddress: configuredWalletAddress } = useWalletAddressForToken(
    connectedWallets,
    sourceToken,
  );

  const supportedChains = useMemo(() => {
    return getSupportedChains({
      walletAddress: configuredWalletAddress ?? machineWalletAddress,
      walletSupportedChains,
    });
  }, [configuredWalletAddress, machineWalletAddress, walletSupportedChains]);

  return { supportedChains };
};
