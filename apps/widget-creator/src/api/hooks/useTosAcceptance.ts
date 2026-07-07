import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { getTosAcceptance } from '../requests/getTosAcceptance';
import { FeeServiceGetTosError } from '../errors';
import type { TosAcceptance } from '../types';

export const useTosAcceptance = () => {
  const { authenticated, getAccessToken, user } = usePrivy();

  return useQuery<TosAcceptance, FeeServiceGetTosError>({
    queryKey: ['tos', user?.id],
    enabled: authenticated,
    queryFn: async () => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceGetTosError('NOT_AUTHORIZED');
      }

      return getTosAcceptance(authToken);
    },
  });
};
