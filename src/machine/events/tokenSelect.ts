import { notReachable } from '@/utils/notReachable';
import type { Token } from '@/types/token';

import type { Context } from '@/machine/context';

import { tokenSelectRotate } from './tokenSelectRotate';

export type TokenSelectPayload = {
  variant: 'source' | 'target';
  token: Token | undefined;
};

export const tokenSelect = (
  ctx: Context,
  payload: TokenSelectPayload,
): void => {
  const { variant, token } = payload;

  switch (variant) {
    case 'source':
      if (
        token &&
        token.assetId === ctx.targetToken?.assetId &&
        token.isIntent === ctx.targetToken.isIntent
      ) {
        if (!ctx.sourceToken) {
          return;
        }

        tokenSelectRotate(ctx);

        return;
      }

      if (
        token &&
        !ctx.sourceToken &&
        token.assetId === ctx.targetToken?.assetId &&
        token.isIntent === ctx.targetToken.isIntent
      ) {
        return;
      }

      ctx.sourceToken = token;
      break;
    case 'target':
      if (
        token &&
        token.assetId === ctx.sourceToken?.assetId &&
        token.isIntent === ctx.sourceToken.isIntent
      ) {
        if (!ctx.targetToken) {
          return;
        }

        tokenSelectRotate(ctx);

        return;
      }

      ctx.targetToken = token;
      break;
    default:
      notReachable(variant, { throwError: false });
  }
};
