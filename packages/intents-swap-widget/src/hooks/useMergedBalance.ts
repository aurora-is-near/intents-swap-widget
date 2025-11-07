import { useMemo } from 'react';

import { useWalletBalance } from './useWalletBalance';
import { useIntentsBalance } from './useIntentsBalance';
import { useConfig } from '@/config';

export const useMergedBalance = () => {
  const { connectedWallets } = useConfig();
  const { intentBalances } = useIntentsBalance();
  const { walletBalance } = useWalletBalance(connectedWallets);

  const mergedBalance = useMemo(
    () => ({ ...walletBalance, ...intentBalances }),
    [walletBalance, intentBalances],
  );

  return { mergedBalance };
};
