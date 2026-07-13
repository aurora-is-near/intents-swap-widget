import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';
import { AxiosResponse } from 'axios';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { feeServiceApi } from '@/network';

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
  depositAddress?: string;
  depositMemo?: string;
  disabled?: boolean;
};

export const useOneClickExecutionStatus = ({
  depositAddress,
  depositMemo,
  disabled,
}: Options = {}): UseQueryResult<ExecutionStatus> => {
  const { apiKey } = useConfig();

  return useQuery({
    queryKey: ['oneClickExecutionStatus', depositAddress],
    queryFn: async (): Promise<ExecutionStatus> => {
      if (!depositAddress) {
        throw new Error(
          'Deposit address is required to fetch execution status',
        );
      }

      let result: AxiosResponse<GetExecutionStatusResponse>;

      try {
        result = await feeServiceApi.get<GetExecutionStatusResponse>(
          `/api/status/${apiKey ?? ''}?depositAddress=${depositAddress}${depositMemo ? `&depositMemo=${depositMemo}` : ''}`,
        );
      } catch (error) {
        logger.error('Error polling 1Click execution status', error);

        throw error;
      }

      return {
        ...result.data,
        swapDetails: {
          ...result.data.swapDetails,
          amount: result.data.swapDetails.amountIn,
          amountUsd: result.data.swapDetails.amountInUsd,
        },
      };
    },
    enabled: !disabled && !!depositAddress,
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
