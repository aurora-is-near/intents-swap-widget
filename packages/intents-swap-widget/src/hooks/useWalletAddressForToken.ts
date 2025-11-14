import { useMemo } from 'react';
import { Token, WalletAddresses } from '../types';
import { getWalletAddressForToken } from '../utils/getWalletAddressForToken';

export const useWalletAddressForToken = (
  connectedWallets: WalletAddresses,
  token?: Token,
) => {
  const walletAddress = useMemo(
    () => getWalletAddressForToken(connectedWallets, token),
    [connectedWallets, token],
  );

  return { walletAddress };
};
