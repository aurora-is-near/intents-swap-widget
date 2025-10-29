import type { Context, ContextChange } from '@/machine/context';

export type Subscription = {
  checker: (ctx: Context, changes: ContextChange[], debug?: boolean) => boolean;
  action: (ctx: Context, changes: ContextChange[], debug?: boolean) => void;
};
