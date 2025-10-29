import { useMemo } from 'react';

import { useConfig } from '@/config';

import { useWalletBalance } from './useWalletBalance';
import { useIntentsBalance } from './useIntentsBalance';

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
