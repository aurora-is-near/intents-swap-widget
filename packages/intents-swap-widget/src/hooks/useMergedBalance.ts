import { useMemo } from 'react';

import { useWalletBalance } from './useWalletBalance';
import { useIntentsBalance } from './useIntentsBalance';
import { useConfig } from '@/config';

export const useMergedBalance = () => {
  const { walletAddress } = useConfig();
  const { intentBalances } = useIntentsBalance();
  const { walletBalance } = useWalletBalance(walletAddress);

  const mergedBalance = useMemo(
    () => ({ ...walletBalance, ...intentBalances }),
    [walletBalance, intentBalances],
  );

  return { mergedBalance };
};
