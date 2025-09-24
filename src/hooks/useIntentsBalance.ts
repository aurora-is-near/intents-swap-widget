import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getIntentsBalances } from '@/utils/intents/getIntentsBalance';
import { notReachable } from '@/utils/notReachable';
import type { TokenBalances } from '@/types/token';

import { useTokens } from './useTokens';

export const useIntentsBalance = () => {
  const { walletAddress, intentsAccountType } = useConfig();

  const { tokens } = useTokens();
  const tokenIds = tokens
    .filter((token) => token.isIntent)
    .map((token) => token.assetId);

  const intentsAccountId = getIntentsAccountId({
    walletAddress: walletAddress ?? '',
    addressType: intentsAccountType,
  });

  const query = useQuery<TokenBalances>({
    enabled: !!walletAddress && !!intentsAccountId && tokens.length > 0,
    queryKey: ['intentsBalances', intentsAccountId],
    queryFn: async () => {
      if (!intentsAccountId) {
        return {};
      }

      const data = await getIntentsBalances(intentsAccountId, tokenIds);
      
      return data;
    },
  });

  const intentBalances =
    useMemo(() => {
      switch (query.status) {
        case 'error':
          logger.error('Unable to load intents balances:', query.error);

          return {};
        case 'success':
          return Object.fromEntries(
            Object.entries(query.data).map(([assetId, balance]) => [
              `intent-${assetId}`,
              balance,
            ]),
          );
        case 'pending':
          return {};
        default:
          notReachable(query, { throwError: false });

          return {};
      }
    }, [query]) ?? {};

  return {
    ...query,
    intentBalances,
  };
};
