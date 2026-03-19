import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useConfig } from '@/config';
import {
  FEE_SERVICE_TOKENS_QUERY_KEY,
  fetchFeeServiceTokens,
} from '@/utils/feeServiceTokens';

export const useTokenVolumeStats = () => {
  const { apiKey } = useConfig();

  const { data } = useQuery({
    queryKey: [FEE_SERVICE_TOKENS_QUERY_KEY, apiKey],
    queryFn: () => fetchFeeServiceTokens(apiKey!),
    enabled: !!apiKey,
    staleTime: 10 * 60 * 1000,
    select: (response) => response.assetStats,
  });

  const volumeRank = useMemo<Map<string, number>>(() => {
    if (!data?.length) {
      return new Map();
    }

    const sorted = [...data].sort(
      (a, b) => parseFloat(b.volumeAmountUsd) - parseFloat(a.volumeAmountUsd),
    );

    const map = new Map<string, number>();

    sorted.forEach((stat, index) => {
      map.set(stat.tokenId, index);
    });

    return map;
  }, [data]);

  return { volumeRank };
};
