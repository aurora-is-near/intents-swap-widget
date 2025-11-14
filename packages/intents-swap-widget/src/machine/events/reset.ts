import type { Machine } from '@/machine';
import type { Context } from '@/machine/context';

export const reset = (_ctx: Context, _payload: null, machine: Machine) => {
  return machine.resetContext();
};
