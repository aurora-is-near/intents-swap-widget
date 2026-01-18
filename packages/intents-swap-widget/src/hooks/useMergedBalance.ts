import { useMemo } from 'react';

import { useWalletBalance } from './useWalletBalance';
import { useIntentsBalance } from './useIntentsBalance';
import { useConnectedWallets } from './useConnectedWallets';

export const useMergedBalance = () => {
  const { connectedWallets } = useConnectedWallets();
  const { intentBalances } = useIntentsBalance();
  const { walletBalance } = useWalletBalance(connectedWallets);

  const mergedBalance = useMemo(
    () => ({ ...walletBalance, ...intentBalances }),
    [walletBalance, intentBalances],
  );

  return { mergedBalance };
};
