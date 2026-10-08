import { CHAINS } from '@aurora-is-near/intents-swap-widget';
import type {
  Chains,
  Context,
  Token,
} from '@aurora-is-near/intents-swap-widget';
import {
  formatBigToHuman,
  formatUsdAmount,
} from '@aurora-is-near/intents-swap-widget/utils';

import { formatAmount } from '../../utils';

/** Atomic units to `1,240.5` (see `formatAmount`); '' while there's none. */
export const formatTokenAmount = (
  amount: string | 0 | undefined,
  token: Pick<Token, 'decimals'>,
) => {
  const human = amount
    ? formatBigToHuman(String(amount), token.decimals, false)
    : '';

  return human ? formatAmount(human) : '';
};

type TransferSummary = {
  source: Token;
  target: Token;
  amountIn: string;
  /** The quote's output, else the estimate from token prices. */
  amountOut: string;
  /** The quote's USD values; null without a quote. */
  amountInUsd: number | null;
  amountOutUsd: number | null;
  /** What the swap costs: the USD value in minus the USD value out. */
  fee: { usd: string; percent: string } | null;
  /** `1 SOL = 150.12 USDC` */
  rate: string;
  /** Seconds. */
  timeEstimate: number | null;
  recipient: string | undefined;
};

export const getTransferSummary = (ctx: Context): TransferSummary | null => {
  const { sourceToken: source, targetToken: target } = ctx;

  if (!source || !target) {
    return null;
  }

  const quote = ctx.quote && 'amountOut' in ctx.quote ? ctx.quote : undefined;
  const amountOut = quote?.amountOut ?? ctx.targetTokenAmount;

  const inUsd = Number(quote?.amountInUsd);
  const outUsd = Number(quote?.amountOutUsd);
  const cost = Math.max(0, inUsd - outUsd);
  const fee =
    Number.isFinite(cost) && inUsd > 0
      ? {
          usd:
            cost < 0.01 ? `<${formatUsdAmount(0.01)}` : formatUsdAmount(cost),
          percent: `${((cost / inUsd) * 100).toFixed(2)}%`,
        }
      : null;

  const inNumber = Number(
    formatBigToHuman(ctx.sourceTokenAmount, source.decimals, false),
  );

  const outNumber = Number(formatBigToHuman(amountOut, target.decimals, false));
  const price =
    quote && inNumber > 0 && outNumber > 0
      ? inNumber / outNumber
      : target.price / source.price;

  return {
    source,
    target,
    amountIn: formatTokenAmount(ctx.sourceTokenAmount, source),
    amountOut: formatTokenAmount(amountOut, target),
    amountInUsd: Number.isFinite(inUsd) ? inUsd : null,
    amountOutUsd: Number.isFinite(outUsd) ? outUsd : null,
    fee,
    rate: Number.isFinite(price)
      ? `1 ${target.symbol} = ${formatAmount(price)} ${source.symbol}`
      : '—',
    timeEstimate: ctx.quote?.timeEstimate ?? null,
    recipient: target.isIntent ? undefined : ctx.sendAddress,
  };
};

export const chainLabel = (chain: Chains) =>
  CHAINS.find((item) => item.id === chain)?.label ?? chain.toUpperCase();

/**
 * `250 USDC on Base`. An intents token's `chainName` is "Near Intents
 * (Base)"; inside the account only its network matters.
 */
export const describeAmount = (amount: string, token: Token) =>
  `${amount} ${token.symbol} on ${chainLabel(token.blockchain)}`;
