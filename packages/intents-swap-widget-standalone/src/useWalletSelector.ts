import { useCallback, useState } from 'react';
import { useAppKitWallet } from './useAppKitWallet';
import { useAppKitProviders } from './useAppKitProviders';
import { useNearWallet } from './useNearWallet';

export const useWalletSelector = () => {
  const appKitWallet = useAppKitWallet();
  const appKitProviders = useAppKitProviders();
  const nearWallet = useNearWallet();
  const [showSelector, setShowSelector] = useState(false);

  const connect = useCallback(() => {
    setShowSelector(true);
  }, []);

  const disconnect = useCallback(async () => {
    if (nearWallet.isConnected) {
      await nearWallet.disconnect();

      return;
    }

    await appKitWallet.disconnect();
  }, [appKitWallet, nearWallet]);

  const selectNear = useCallback(async () => {
    setShowSelector(false);

    if (appKitWallet.isConnected) {
      await appKitWallet.disconnect();
    }

    await nearWallet.connect();
  }, [appKitWallet, nearWallet]);

  const selectEvmSolana = useCallback(async () => {
    setShowSelector(false);

    if (nearWallet.isConnected) {
      await nearWallet.disconnect();
    }

    await appKitWallet.connect();
  }, [appKitWallet, nearWallet]);

  const closeSelector = useCallback(() => {
    setShowSelector(false);
  }, []);

  return {
    showSelector,
    connectedWallets: {
      default: nearWallet.isConnected
        ? nearWallet.accountId
        : appKitWallet.address
    },
    providers: {
      ...appKitProviders,
      near: nearWallet.nearBasedWallet
    },
    connect,
    disconnect,
    selectNear,
    selectEvmSolana,
    closeSelector,
  };
};
