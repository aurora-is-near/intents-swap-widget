import { useAppKitWallet } from './useAppKitWallet';
import { useConfig } from '../config';

export const useConnectedWallets = () => {
  const { connectedWallets } = useConfig();
  const { address } = useAppKitWallet();

  if (!address) {
    return { connectedWallets };
  }

  return {
    connectedWallets: {
      ...connectedWallets,
      default: address,
    },
  };
};
