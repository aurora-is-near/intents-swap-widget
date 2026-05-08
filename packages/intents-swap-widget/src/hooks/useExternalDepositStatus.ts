import { guardStates, useUnsafeSnapshot } from '@/machine';
import { useOneClickExecutionStatus } from './useOneClickExecutionStatus';

export const useExternalDepositStatus = (
  depositAddress: string,
  depositMemo?: string,
) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  return useOneClickExecutionStatus({
    depositAddress,
    depositMemo,
    disabled: !isValidState,
  });
};
