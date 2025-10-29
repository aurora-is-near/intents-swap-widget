import { useQuery } from '@tanstack/react-query';
import { JsonRpcProvider } from '@near-js/providers';

export function useNearAccount(accountId: string | null | undefined) {
  const nearAccount = useQuery({
    queryKey: ['nearAccount', accountId],
    queryFn: async () => {
      const provider = new JsonRpcProvider({
        url: 'https://rpc.mainnet.near.org',
      });

      return provider.viewAccount(accountId as string);
    },
    enabled: accountId != null,
  });

  return nearAccount;
}
