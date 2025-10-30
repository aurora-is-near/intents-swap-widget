import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';
import { useQuery } from '@tanstack/react-query';

import { logger } from '@/logger';
import { WidgetError } from '@/errors';
import { guardStates, useUnsafeSnapshot } from '@/machine';

export const useExternalDepositStatus = (depositAddress: string) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  const pollDepositStatus = async () => {
    if (!isValidState) {
      throw new WidgetError(
        `Unable to poll deposit status in current state ${ctx.state}`,
      );
    }

    try {
      return await OneClickService.getExecutionStatus(depositAddress);
    } catch (error) {
      logger.error(error);
    }
  };

  return useQuery({
    queryKey: ['depositStatus', depositAddress],
    queryFn: pollDepositStatus,
    enabled: !!depositAddress && isValidState,
    refetchInterval: 3000,
    retry: 3,
  });
};
