import type { Context } from '@/machine/context';
import type { ErrorType } from '@/machine/errors';

export type ErrorSetPayload = ErrorType | null;

export const errorSet = (ctx: Context, payload: ErrorSetPayload): void => {
  ctx.error = payload;
};
