import {
  useIsConnectionRestored,
  useTonAddress,
  useTonConnectUI,
  useTonWallet as useTonConnectWallet,
} from '@tonconnect/ui-react';

export const useTonWallet = () => {
  const tonAddress = useTonAddress();
  const tonWallet = useTonConnectWallet();
  const [tonConnectUI] = useTonConnectUI();
  const isTonConnectionRestored = useIsConnectionRestored();

  // Track TON connecting state: wallet is being connected but address not yet available
  const isConnecting = isTonConnectionRestored && !!tonWallet && !tonAddress;

  return {
    address: tonAddress,
    isConnecting,
    isConnected: !!tonAddress,
    disconnect: tonConnectUI.disconnect,
  };
};
