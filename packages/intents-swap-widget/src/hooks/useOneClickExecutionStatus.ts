import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  GetExecutionStatusResponse,
  OneClickService,
} from '@defuse-protocol/one-click-sdk-typescript';

import { logger } from '@/logger';

const POLL_INTERVAL_MS = 3000;

const TERMINAL_STATUSES = new Set<GetExecutionStatusResponse.status>([
  GetExecutionStatusResponse.status.SUCCESS,
  GetExecutionStatusResponse.status.FAILED,
  GetExecutionStatusResponse.status.REFUNDED,
]);

type ExecutionStatus = Omit<GetExecutionStatusResponse, 'swapDetails'> & {
  swapDetails: GetExecutionStatusResponse['swapDetails'] & {
    amount?: string;
    amountUsd?: string;
  };
};

type Options = {
  enabled?: boolean;
};

export const useOneClickExecutionStatus = (
  depositAddress: string | undefined,
  options?: Options,
): UseQueryResult<ExecutionStatus> => {
  const enabled = (options?.enabled ?? true) && !!depositAddress;

  return useQuery({
    queryKey: ['oneClickExecutionStatus', depositAddress],
    queryFn: async (): Promise<ExecutionStatus> => {
      try {
        const result = await OneClickService.getExecutionStatus(
          depositAddress!,
        );

        return {
          ...result,
          swapDetails: {
            ...result.swapDetails,
            amount: result.swapDetails.amountIn,
            amountUsd: result.swapDetails.amountInUsd,
          },
        };
      } catch (e) {
        logger.error('Error polling 1Click execution status', e);
        throw e;
      }
    },
    enabled: !!depositAddress && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status && TERMINAL_STATUSES.has(status)) {
        return false;
      }

      return POLL_INTERVAL_MS;
    },
    gcTime: 0,
  });
};
