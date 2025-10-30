import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

type Delta = {
  usd: number;
  percentage: number;
};

export const getUsdTradeDelta = (
  ctx: DeepReadonly<Context>,
): Delta | undefined => {
  if (!ctx.quote) {
    return undefined;
  }

  const usdDelta =
    parseFloat(ctx.quote.amountOutUsd) - parseFloat(ctx.quote.amountInUsd);

  const percentageDelta =
    ((parseFloat(ctx.quote.amountOutUsd) - parseFloat(ctx.quote.amountInUsd)) /
      parseFloat(ctx.quote.amountInUsd)) *
    100;

  return {
    usd: usdDelta,
    percentage: percentageDelta,
  };
};
