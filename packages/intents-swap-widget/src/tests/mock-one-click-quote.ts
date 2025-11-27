import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import type {
  QuoteResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

import { formatBigToHuman } from '../utils/formatters/formatBigToHuman';

export const mockOneClickQuote = ({
  amount,
  recipient,
  sourceToken,
  targetToken,
  refundTo,
  quote,
  quoteRequest,
}: {
  amount: string;
  recipient: string;
  sourceToken: TokenResponse;
  targetToken: TokenResponse;
  refundTo?: string;
  quote?: Pick<
    QuoteResponse['quote'],
    'timeEstimate' | 'deadline' | 'timeWhenInactive' | 'depositAddress'
  >;
  quoteRequest?: Pick<
    QuoteResponse['quoteRequest'],
    | 'dry'
    | 'slippageTolerance'
    | 'quoteWaitingTimeMs'
    | 'deadline'
    | 'referral'
    | 'refundType'
    | 'recipientType'
    | 'depositType'
    | 'depositMode'
    | 'swapType'
  >;
}): QuoteResponse => {
  const fee = 1 - 0.001; // assuming 0.1% fee
  const amountIn = parseFloat(formatBigToHuman(amount, sourceToken.decimals));
  const amountInUsd = amountIn * sourceToken.price;

  return {
    quote: {
      amountIn: amount,
      minAmountIn: amount,
      amountInFormatted: `${amountIn}`,
      amountInUsd: `${amountInUsd}`,
      amountOut: `${(amountInUsd / targetToken.price) * 10 ** targetToken.decimals * fee}`,
      amountOutFormatted: `${(amountInUsd / targetToken.price) * fee}`,
      amountOutUsd: `${amountInUsd * fee}`,
      minAmountOut: `${(amountInUsd / targetToken.price) * 10 ** targetToken.decimals * fee}`,
      timeEstimate: 45,
      deadline: '2025-11-28T11:28:17.478Z',
      timeWhenInactive: '2025-11-28T11:28:17.478Z',
      depositAddress: 'test-deposit-address',
      ...quote,
    },

    quoteRequest: {
      dry: false,

      slippageTolerance: 100,
      quoteWaitingTimeMs: 3000,
      originAsset: sourceToken.assetId,
      deadline: '2025-11-27T12:28:14.081Z',
      destinationAsset: targetToken.assetId,
      referral: 'test_app',

      amount,
      refundTo: refundTo ?? recipient,
      recipient,

      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipientType: QuoteRequest.recipientType.INTENTS,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      depositMode: QuoteRequest.depositMode.SIMPLE,
      swapType: QuoteRequest.swapType.EXACT_INPUT,

      ...quoteRequest,
    },

    timestamp: '2025-11-27T11:28:14.388Z',
    signature:
      'ed25519:9BzqFDYNRH2YCCdBKU6wSCVoFY8BPYUuVqR5UQXMHeHcVyaX36FSgc6wubH7WyMi6eDCfrpzoQzJBKgpJ8mq9aL',
  };
};
