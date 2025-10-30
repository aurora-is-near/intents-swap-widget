import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { TokenBalances } from '../types/token';

export const useWalletBalance = (walletAddress: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { data } = useQuery<TokenBalances>({
    queryKey: ['walletBalances', walletAddress],
    queryFn: async () => {
      return (
        queryClient.getQueryData<TokenBalances>([
          'walletBalances',
          walletAddress,
        ]) ?? {}
      );
    },
  });

  const setWalletBalance = (
    userWalletAddress: string,
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
