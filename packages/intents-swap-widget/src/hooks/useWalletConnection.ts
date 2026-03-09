import { useConfig } from '../config';

export const useWalletConnection = () => {
  const { onWalletSignin, onWalletSignout, connectedWallets } = useConfig();

  return {
    walletSignIn: onWalletSignin,
    walletSignOut: onWalletSignout,
    isConnected: Object.values(connectedWallets).some((addr) => !!addr),
  };
};
