import { guardStates, useUnsafeSnapshot } from '@/machine';
import { useOneClickExecutionStatus } from './useOneClickExecutionStatus';

export const useExternalDepositStatus = (depositAddress: string) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  return useOneClickExecutionStatus(depositAddress, { enabled: isValidState });
};
