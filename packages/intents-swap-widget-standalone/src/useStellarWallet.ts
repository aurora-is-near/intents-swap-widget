import { useEffect, useState } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import {
  KitEventType,
  SwkAppDarkTheme,
} from '@creit.tech/stellar-wallets-kit/types';
import { WalletConnectModule } from '@creit.tech/stellar-wallets-kit/modules/wallet-connect';

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
  modules: [
    ...defaultModules(),
    new WalletConnectModule({
      projectId: '76f61d4322c80976d1a24a1263a9d082',
      metadata: {
        name: 'Aurora Intents Swap Widget',
        description: 'Aurora Intents Swap Widget',
        icons: ['https://intents.aurora.dev/favicon/favicon-96x96.png'],
        url: 'https://intents.aurora.dev',
      },
    }),
  ],
});

const isStellarConnected = async () => {
  const { address } = await StellarWalletsKit.getAddress();

  return !!address;
};

export const useStellarWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
      if (!event.payload.address) {
        return;
      }

      setWalletAddress(event.payload.address);
    });

    StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      setWalletAddress(null);
    });
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
