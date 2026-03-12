import { useCallback, useMemo, useState } from 'react';
import { Providers } from '@aurora-is-near/intents-swap-widget';
import { NearWalletBase } from '@hot-labs/near-connect';

import { useAppKitWallet } from './useAppKitWallet';
import { useStellarWallet } from './useStellarWallet';
import { useAppKitProviders } from './useAppKitProviders';
import { useNearWallet } from './useNearWallet';

const isNearWallet = (
  nearWallet?: NearWalletBase,
): nearWallet is NearWalletBase => !!nearWallet;

export const useWalletSelector = () => {
  const appKitWallet = useAppKitWallet();
  const appKitProviders = useAppKitProviders();
  const nearWallet = useNearWallet();
  const stellarWallet = useStellarWallet();

  const [showSelector, setShowSelector] = useState(false);

  const connect = useCallback(() => {
    setShowSelector(true);
  }, []);

  const disconnect = useCallback(async () => {
    if (nearWallet.isConnected) {
      await nearWallet.disconnect();

      return;
    }

    if (stellarWallet.walletAddress) {
      await stellarWallet.disconnect();

      return;
    }

    await appKitWallet.disconnect();
  }, [appKitWallet, nearWallet, stellarWallet]);

  const selectNear = useCallback(async () => {
    setShowSelector(false);

    if (appKitWallet.isConnected) {
      await appKitWallet.disconnect();
    }

    if (stellarWallet.walletAddress) {
      await stellarWallet.disconnect();
    }

    await nearWallet.connect();
  }, [appKitWallet, nearWallet, stellarWallet]);

  const selectEvmSolana = useCallback(async () => {
    setShowSelector(false);

    if (nearWallet.isConnected) {
      await nearWallet.disconnect();
    }

    if (stellarWallet.walletAddress) {
      await stellarWallet.disconnect();
    }

    await appKitWallet.connect();
  }, [appKitWallet, nearWallet, stellarWallet]);

  const selectStellar = useCallback(async () => {
    setShowSelector(false);

    if (nearWallet.isConnected) {
      await nearWallet.disconnect();
    }

    if (appKitWallet.isConnected) {
      await appKitWallet.disconnect();
    }

    await stellarWallet.connect();
  }, [appKitWallet, nearWallet, stellarWallet]);

  const closeSelector = useCallback(() => {
    setShowSelector(false);
  }, []);

  const providers = useMemo(() => {
    const walletProviders: Providers = {
      ...appKitProviders,
    };

    const { nearWalletBase } = nearWallet;

    if (isNearWallet(nearWalletBase)) {
      walletProviders.near = () => nearWalletBase;
    }

    if (stellarWallet.walletAddress) {
      walletProviders.stellar = {
        publicKey: stellarWallet.walletAddress,
        signMessage: stellarWallet.signMessage,
        signTransaction: stellarWallet.signTransaction,
      };
    }

    return walletProviders;
  }, [appKitProviders, nearWallet, stellarWallet]);

  const connectedWallets = useMemo(() => {
    let walletAddress: string | undefined;

    if (stellarWallet.walletAddress) {
      walletAddress = stellarWallet.walletAddress;
    }

    if (nearWallet.isConnected) {
      walletAddress = nearWallet.accountId;
    }

    if (appKitWallet.isConnected) {
      walletAddress = appKitWallet.address;
    }

    return {
      default: walletAddress,
    };
  }, [nearWallet, appKitWallet, stellarWallet]);

  return {
    showSelector,
    connectedWallets,
    providers,
    connect,
    disconnect,
    selectNear,
    selectEvmSolana,
    selectStellar,
    closeSelector,
  };
};
