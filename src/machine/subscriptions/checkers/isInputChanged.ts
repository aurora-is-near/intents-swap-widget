import { guardStates } from '@/machine/guards';
import type { Context, ContextChange } from '@/machine/context';

export const isInputChanged = (ctx: Context, changes: ContextChange[]) => {
  const isValidState = guardStates(ctx, ['initial_wallet']);
  const isValidDryState = guardStates(ctx, ['initial_dry']);

  return {
    isDry: isValidDryState && !isValidState,
    isChanged: changes.some(
      (change) =>
        change &&
        [
          'sendAddress',
          'sourceToken',
          'targetToken',
          'targetTokenAmount',
          'sourceTokenAmount',
          'sourceTokenBalance',
          'isDepositFromExternalWallet',
        ].includes(change.key),
    ),
  };
};
