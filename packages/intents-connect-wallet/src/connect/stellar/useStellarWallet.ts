import { useEffect, useState } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { xBullModule as XBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import {
  KitEventType,
  SwkAppDarkTheme,
} from '@creit.tech/stellar-wallets-kit/types';

StellarWalletsKit.init({
  theme: {
    ...SwkAppDarkTheme,
    background: '#202020',
    'background-secondary': '#bc9af8',
    'foreground-strong': '#f3f3f5',
    foreground: '#f3f3f5',
    'foreground-secondary': '#24262c',
    // 'primary': '',
    // 'primary-foreground': '',
    transparent: 'transparent',
    lighter: '#42444e',
    light: '#42444e',
    'light-gray': '#42444e',
    gray: '#42444e',
    danger: '#f88',
    border: '#bc9af8',
    shadow: '0 0 0 1px #42444e',
    'border-radius': '16px',
    'font-family': 'Inter',
  },
  modules: [new XBullModule(), new FreighterModule()],
});

const isStellarConnected = async () => {
  const { address } = await StellarWalletsKit.getAddress();

  return !!address;
};

export const useStellarWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const offStateUpdated = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        if (!event.payload.address) {
          return;
        }

        setWalletAddress(event.payload.address);
      },
    );

    const offDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      setWalletAddress(null);
    });

    return () => {
      offStateUpdated();
      offDisconnect();
    };
  }, []);

  const connect = async () => {
    await StellarWalletsKit.authModal();
  };

  const disconnect = async () => {
    await StellarWalletsKit.disconnect();
  };

  return {
    connect,
    disconnect,
    walletAddress,
    isConnected: !!walletAddress,
    getIsConnected: isStellarConnected,
    signMessage: async (message: string) => {
      const { signedMessage, signerAddress } =
        await StellarWalletsKit.signMessage(message);

      return { signedMessage, signerAddress };
    },
    signTransaction: async (transaction: string) => {
      const { signedTxXdr, signerAddress } =
        await StellarWalletsKit.signTransaction(transaction);

      return { signedTxXdr, signerAddress };
    },
  };
};
