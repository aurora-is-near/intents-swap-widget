import { DefaultToken } from '../../types';
import { notReachable } from '@/utils/notReachable';

import type { Context } from '@/machine/context';

export type TokenSetDefaultPayload = {
  variant: 'source' | 'target';
  token: DefaultToken | undefined | null;
};

export const tokenSetDefault = (
  ctx: Context,
  payload: TokenSetDefaultPayload,
): void => {
  const { variant, token } = payload;

  switch (variant) {
    case 'source':
      ctx.sourceTokenDefault = token;
      break;
    case 'target':
      ctx.targetTokenDefault = token;
      break;
    default:
      notReachable(variant, { throwError: false });
  }
};
