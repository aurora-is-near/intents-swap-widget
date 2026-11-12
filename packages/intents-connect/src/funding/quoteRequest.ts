import { FUNDING_RAIL, type FundingRequest } from '@/funding/types';
import type { SwapQuoteRequest } from '@/intentsApi/types';

export const DEFAULT_FUNDING_SLIPPAGE_BPS = 100;
export const DEFAULT_FUNDING_DEADLINE_MS = 15 * 60_000;

/**
 * The 1Click quote for a funding: `amount` of `originAsset`, taken from the
 * intents (or confidential) account and refunded to it, paid out as the
 * destination token to `recipient` on the destination chain. Settles on
 * public rails (`confidentiality` left unset).
 */
export const buildFundingQuoteRequest = ({
  request,
  intentsAccountId,
  recipient,
  now = Date.now,
}: {
  request: FundingRequest;
  intentsAccountId: string;
  /** The intermediary's address on the destination chain. */
  recipient: string;
  now?: () => number;
}): SwapQuoteRequest => {
  const rail = FUNDING_RAIL[request.source];

  return {
    dry: false,
    swapType: 'EXACT_INPUT',
    slippageTolerance:
      request.slippageTolerance ?? DEFAULT_FUNDING_SLIPPAGE_BPS,
    originAsset: request.originAsset,
    depositType: rail,
    destinationAsset: request.destination.assetId,
    amount: request.amount,
    refundTo: intentsAccountId,
    refundType: rail,
    recipient,
    recipientType: 'DESTINATION_CHAIN',
    deadline: new Date(
      now() + (request.deadlineMs ?? DEFAULT_FUNDING_DEADLINE_MS),
    ).toISOString(),
    quoteWaitingTimeMs: 0,
  };
};
