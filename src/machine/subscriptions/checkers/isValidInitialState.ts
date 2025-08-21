import { guardStates } from '@/machine/guards';
import type { Context } from '@/machine/context';

export const isValidInitialState = (ctx: Context) => {
  return guardStates(ctx, ['initial_wallet', 'initial_dry']);
};
