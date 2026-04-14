import { useQuery } from '@tanstack/react-query';

import { useOneClickExternalDepositStatus } from './useOneClickExternalDepositStatus';

import { guardStates, useUnsafeSnapshot } from '@/machine';
import { WidgetError } from '@/errors';
import { logger } from '@/logger';

export const useExternalDepositStatus = (depositAddress: string) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  const { pollDepositStatus: pollOneClickDepositStatus } =
    useOneClickExternalDepositStatus({ depositAddress });

  const pollDepositStatus = async () => {
    if (!isValidState) {
      throw new WidgetError(
        `Unable to poll deposit status in current state ${ctx.state}`,
      );
    }

    try {
      return await pollOneClickDepositStatus();
    } catch (e) {
      logger.error('Error polling external deposit status', e);
      throw e;
    }
  };

  return useQuery({
    queryKey: ['depositStatus', depositAddress],
    queryFn: pollDepositStatus,
    enabled: !!depositAddress && isValidState,
    refetchInterval: 3000,
    retry: 3,
    gcTime: 0, // do not cache!!!
  });
};
