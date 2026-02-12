import { snapshot } from 'valtio';

import { tokenSelectRotate } from './tokenSelectRotate';
import { configStore } from '@/config';
import { notReachable } from '@/utils/notReachable';
import type { Token } from '@/types/token';
import type { Context } from '@/machine/context';

export type TokenSelectPayload = {
  variant: 'source' | 'target';
  token: Token | undefined;
};

export const tokenSelect = (
  ctx: Context,
  payload: TokenSelectPayload,
): void => {
  const { variant, token } = payload;
  const { config } = snapshot(configStore);

  if (config.disableTokenSelection) {
    return;
  }

  switch (variant) {
    case 'source':
      if (
        token &&
        token.assetId === ctx.targetToken?.assetId &&
        token.isIntent === ctx.targetToken.isIntent &&
        config.enableAutoTokensSwitching
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
        token.isIntent === ctx.targetToken.isIntent &&
        config.enableAutoTokensSwitching
      ) {
        return;
      }

      ctx.sourceToken = token;
      break;
    case 'target':
      if (
        token &&
        token.assetId === ctx.sourceToken?.assetId &&
        token.isIntent === ctx.sourceToken.isIntent &&
        config.enableAutoTokensSwitching
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
