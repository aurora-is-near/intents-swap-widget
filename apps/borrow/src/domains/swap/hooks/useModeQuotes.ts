import { useUnsafeSnapshot } from '@aurora-is-near/intents-swap-widget';
import { useEffect, useState } from 'react';
import type { SwapConfidentialMode } from '@aurora-is-near/intents-swap-widget';

/** What each mode's card shows: the last quote's output, if any. */
export type ModeQuotes = Partial<Record<SwapConfidentialMode, string>>;

type SavedQuotes = { pair: string; quotes: ModeQuotes };

/**
 * Up to 6 decimals, or 6 significant digits below 1, so a tiny output such
 * as 0.0000001 WBTC never rounds to 0.
 */
const formatAmount = (amount: string) => {
  const value = Number(amount);

  return value.toLocaleString(
    'en-US',
    value < 1 ? { maximumSignificantDigits: 6 } : { maximumFractionDigits: 6 },
  );
};

/**
 * The swap widget's quotes, by the mode each was fetched in. The widget only
 * quotes its current mode, so the other card keeps its last quote. Both are
 * dropped once the sell token, buy token or amount changes, so a card never
 * shows a quote for another swap.
 */
export const useModeQuotes = (): {
  quotes: ModeQuotes;
  isQuoting: boolean;
} => {
  const { ctx } = useUnsafeSnapshot();
  const { quote, quoteStatus, confidentialMode, targetToken } = ctx;

  const pair = [
    ctx.sourceToken?.assetId,
    targetToken?.assetId,
    ctx.sourceTokenAmount,
  ].join('|');

  const [saved, setSaved] = useState<SavedQuotes>({ pair, quotes: {} });

  // Only a new quote is saved: on a mode switch the old mode's quote is
  // still in the store until the widget resets it and quotes again.
  useEffect(() => {
    if (!quote || !targetToken || !('amountOutFormatted' in quote)) {
      return;
    }

    const output = `≈ ${formatAmount(quote.amountOutFormatted)} ${targetToken.symbol}`;

    setSaved((prev) => ({
      pair,
      quotes: {
        ...(prev.pair === pair ? prev.quotes : {}),
        [confidentialMode]: output,
      },
    }));
  }, [quote]);

  return {
    quotes: saved.pair === pair ? saved.quotes : {},
    isQuoting: quoteStatus === 'pending',
  };
};
