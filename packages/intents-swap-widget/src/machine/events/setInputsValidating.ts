import type { Context } from '@/machine/context';

export type InputsValidatingPayload = boolean;

export const setInputsValidating = (
  ctx: Context,
  payload: InputsValidatingPayload,
): void => {
  ctx.areInputsValidating = payload;
};
