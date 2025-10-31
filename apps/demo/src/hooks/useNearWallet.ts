import { useWalletSelector } from '@near-wallet-selector/react-hook';

export function useNearWallet() {
  const {
    signIn: connect,
    signOut: disconnect,
    signedAccountId: address,
  } = useWalletSelector();

  const isConnected = address !== null;

  return {
    address,
    isConnected,
    connect,
    disconnect,
  };
}
