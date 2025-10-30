import { SwapQuote as SwapQuoteBase } from './SwapQuote';
import { SwapQuoteSkeleton } from './SwapQuoteSkeleton';

export const SwapQuote = Object.assign(SwapQuoteBase, {
  Skeleton: SwapQuoteSkeleton,
});
