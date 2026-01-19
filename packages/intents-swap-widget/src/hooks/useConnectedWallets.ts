import { useAppKitWallet } from './useAppKitWallet';
import { useConfig } from '../config';

export const useConnectedWallets = () => {
  const { connectedWallets, enableStandaloneMode } = useConfig();
  const { address } = useAppKitWallet();

  // If in standlone mode set the default wallet to the internal AppKit address.
  if (enableStandaloneMode) {
    return { connectedWallets: { default: address } };
  }

  // Otherwise, use the connected wallets passed in via the config.
  return { connectedWallets };
};
