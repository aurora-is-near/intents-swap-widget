import { useAppKitWallet } from './useAppKitWallet';
import { useConfig } from '../config';

export const useConnectedWallets = () => {
  const { connectedWallets } = useConfig();
  const { address } = useAppKitWallet();

  // If we do not have an internal AppKit wallet address (i.e. from standalone mode)
  // then return the `connectedWallets` that are passed into the widget config.
  if (!address) {
    return { connectedWallets };
  }

  // If we do have an internal AppKit wallet address, return that as the default.
  return { connectedWallets: { default: address } };
};
