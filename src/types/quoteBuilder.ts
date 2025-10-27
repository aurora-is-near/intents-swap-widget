import type { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import type { Token } from './token';

export interface QuoteBuilderContext {
  sourceToken: Token;
  targetToken: Token;
  sourceTokenAmount: string;
  targetTokenAmount: string;
  intentsAccountId: string;
  targetWalletAddress: string;
  sendAddress?: string;
  message?: string;
  quoteType: 'exact_in' | 'exact_out';
  isDry: boolean;
}

export interface QuoteParams extends Omit<
  QuoteRequest,
  'recipient' | 'recipientType' | 'depositType' | 'refundTo' | 'refundType'
> {
  recipient?: string;
  recipientType?: QuoteRequest.recipientType;
  depositType?: QuoteRequest.depositType;
  refundTo?: string;
  refundType?: QuoteRequest.refundType;
}

export interface BlockchainQuoteHandler {
  /**
   * Check if this handler can process the given source and target tokens
   */
  canHandle(context: QuoteBuilderContext): boolean;

  /**
   * Build quote parameters for this blockchain combination
   */
  buildQuoteParams(context: QuoteBuilderContext): QuoteParams;

  /**
   * Priority for handler selection (higher = more specific)
   */
  priority: number;
}

export interface QuoteBuilderRegistry {
  /**
   * Register a blockchain-specific quote handler
   */
  register(handler: BlockchainQuoteHandler): void;

  /**
   * Get the best handler for the given context
   */
  getHandler(context: QuoteBuilderContext): BlockchainQuoteHandler | null;

  /**
   * Build quote parameters using the appropriate handler
   */
  buildQuoteParams(context: QuoteBuilderContext): QuoteParams;
}