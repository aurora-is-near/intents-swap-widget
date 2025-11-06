import { useQuery } from '@tanstack/react-query';

import { notReachable } from '../../utils';
import { useOneClickExternalDepositStatus } from './useOneClickExternalDepositStatus';
import { usePoaExternalDepositStatus } from './usePoaExternalDepositStatus';
import { guardStates, useUnsafeSnapshot } from '@/machine';
import { WidgetError } from '@/errors';
import { logger } from '@/logger';

type Args = {
  depositAddress: string;
  depositAddressType: 'one_click' | 'poa';
};

export const useExternalDepositStatus = ({
  depositAddress,
  depositAddressType,
}: Args) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  const { pollDepositStatus: pollOneClickDepositStatus } =
    useOneClickExternalDepositStatus({ depositAddress });

  const { pollDepositStatus: pollPoaDepositStatus } =
    usePoaExternalDepositStatus({ depositAddress });

  const pollDepositStatus = async () => {
    if (!isValidState) {
      throw new WidgetError(
        `Unable to poll deposit status in current state ${ctx.state}`,
      );
    }

    try {
      switch (depositAddressType) {
        case 'one_click':
          return await pollOneClickDepositStatus();
        case 'poa':
          return await pollPoaDepositStatus({
            amount: ctx.sourceTokenAmount,
            assetId: ctx.sourceToken.assetId,
            blockchain: ctx.targetToken.blockchain,
          });
        default:
          return notReachable(depositAddressType);
      }
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
  });
};
