import { useConfig } from '../config';
import { useAppKitWallet } from './useAppKitWallet';

export const useWalletConnection = () => {
  const { connect, disconnect } = useAppKitWallet();
  const { enableStandaloneMode, onWalletSignin, onWalletSignout } = useConfig();

  return {
    walletSignIn: enableStandaloneMode ? connect : onWalletSignin,
    walletSignOut: enableStandaloneMode ? disconnect : onWalletSignout,
  };
};
