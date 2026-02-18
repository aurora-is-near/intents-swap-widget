import { useCallback, useMemo, useState } from 'react';
import { Providers } from '@aurora-is-near/intents-swap-widget';
import { NearWalletBase } from '@hot-labs/near-connect';
import { useAppKitWallet } from './useAppKitWallet';
import { useAppKitProviders } from './useAppKitProviders';
import { useNearWallet } from './useNearWallet';

const isNearWallet = (
  nearWallet?: NearWalletBase,
): nearWallet is NearWalletBase => !!nearWallet;

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

  const providers = useMemo(() => {
    const walletProviders: Providers = {
      ...appKitProviders,
    };

    const { nearWalletBase } = nearWallet;

    if (isNearWallet(nearWalletBase)) {
      walletProviders.near = () => nearWalletBase;
    }

    return walletProviders;
  }, [appKitProviders, nearWallet]);

  const connectedWallets = useMemo(
    () => ({
      default: nearWallet.isConnected
        ? nearWallet.accountId
        : appKitWallet.address,
    }),
    [nearWallet, appKitWallet],
  );

  return {
    showSelector,
    connectedWallets,
    providers,
    connect,
    disconnect,
    selectNear,
    selectEvmSolana,
    closeSelector,
  };
};
