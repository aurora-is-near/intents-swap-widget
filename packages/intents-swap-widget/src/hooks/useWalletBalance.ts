import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { TokenBalances } from '../types/token';
import { WalletAddresses } from '../types';

export const useWalletBalance = (walletAddresses: WalletAddresses) => {
  const queryClient = useQueryClient();
  const { data } = useQuery<TokenBalances>({
    queryKey: ['walletBalances', walletAddresses],
    queryFn: async () => {
      return (
        queryClient.getQueryData<TokenBalances>([
          'walletBalances',
          walletAddresses,
        ]) ?? {}
      );
    },
  });

  const setWalletBalance = (
    userWalletAddress: WalletAddresses,
    newBalances: TokenBalances,
  ) => {
    queryClient.setQueryData<TokenBalances>(
      ['walletBalances', userWalletAddress],
      (old) => ({
        ...old,
        ...newBalances,
      }),
    );
  };

  return {
    walletBalance: data ?? {},
    setWalletBalance,
  };
};
