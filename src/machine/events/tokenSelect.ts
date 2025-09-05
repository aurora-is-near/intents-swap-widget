import { notReachable } from '@/utils/notReachable';
import type { Token } from '@/types/token';
import type { Context } from '@/machine/context';
import { tokenSelectRotate } from './tokenSelectRotate';
import { getIsParticipateWidget } from '../computed/getIsParticipateWidget';

export type TokenSelectPayload = {
  variant: 'source' | 'target';
  token: Token | undefined;
};

export const tokenSelect = (
  ctx: Context,
  payload: TokenSelectPayload,
): void => {
  const { variant, token } = payload;
  const isParticipateWidget = getIsParticipateWidget(ctx);

  switch (variant) {
    case 'source':
      if (
        token &&
        token.assetId === ctx.targetToken?.assetId &&
        token.isIntent === ctx.targetToken.isIntent &&
        !isParticipateWidget
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
        !isParticipateWidget
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
        !isParticipateWidget
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
