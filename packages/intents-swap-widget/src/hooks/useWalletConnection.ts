import { useConfig } from '../config';

export const useWalletConnection = () => {
  const { onWalletSignin, onWalletSignout } = useConfig();

  return {
    walletSignIn: onWalletSignin,
    walletSignOut: onWalletSignout,
  };
};
