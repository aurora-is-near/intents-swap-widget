import type {
  QuoteBuilderContext,
  QuoteParams,
  BlockchainQuoteHandler,
  QuoteBuilderRegistry as IQuoteBuilderRegistry,
} from '@/types/quoteBuilder';
import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { logger } from '@/logger';

export class QuoteBuilderRegistry implements IQuoteBuilderRegistry {
  private handlers: BlockchainQuoteHandler[] = [];

  register(handler: BlockchainQuoteHandler): void {
    this.handlers.push(handler);
    // Sort by priority (higher priority first)
    this.handlers.sort((a, b) => b.priority - a.priority);
    
    logger.debug(`[QuoteRegistry] Registered handler with priority ${handler.priority}`);
  }

  getHandler(context: QuoteBuilderContext): BlockchainQuoteHandler | null {
    const handler = this.handlers.find(h => h.canHandle(context)) || null;
    
    if (handler) {
      logger.debug(`[QuoteRegistry] Found handler for ${context.sourceToken.blockchain} -> ${context.targetToken.blockchain}`);
    } else {
      logger.debug(`[QuoteRegistry] No specific handler found, will use default`);
    }
    
    return handler;
  }

  buildQuoteParams(context: QuoteBuilderContext): QuoteParams {
    const handler = this.getHandler(context);
    
    if (handler) {
      logger.debug(`[QuoteRegistry] Using specialized handler`);
      return handler.buildQuoteParams(context);
    }
    
    logger.debug(`[QuoteRegistry] Using default quote params`);
    return this.buildDefaultQuoteParams(context);
  }

  private buildDefaultQuoteParams(context: QuoteBuilderContext): QuoteParams {
    const {
      sourceToken,
      targetToken,
      intentsAccountId,
      targetWalletAddress,
      sendAddress,
      message,
      quoteType,
      isDry,
    } = context;

    // Default behavior from main branch
    const baseParams: QuoteParams = {
      // Settings
      dry: isDry,
      slippageTolerance: 100, // 1%
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      swapType: quoteType === 'exact_out' 
        ? QuoteRequest.swapType.EXACT_OUTPUT
        : QuoteRequest.swapType.EXACT_INPUT,

      // Assets
      destinationAsset: targetToken.assetId,
      originAsset: sourceToken.assetId,
      amount: quoteType === 'exact_out' ? context.targetTokenAmount : context.sourceTokenAmount,
    };

    if (message) {
      // @ts-expect-error customRecipientMsg is not in the types
      baseParams.customRecipientMsg = message;
    }

    // Handle intents to intents transfer
    if (sourceToken.isIntent && targetToken.isIntent) {
      return {
        ...baseParams,
        recipient: intentsAccountId,
        recipientType: QuoteRequest.recipientType.INTENTS,
        depositType: QuoteRequest.depositType.INTENTS,
        refundTo: intentsAccountId,
        refundType: QuoteRequest.refundType.INTENTS,
      };
    }

    // Handle general transfers
    return {
      ...baseParams,
      recipient: !targetToken.isIntent && sendAddress ? sendAddress : intentsAccountId,
      recipientType: targetToken.isIntent ? QuoteRequest.recipientType.INTENTS : QuoteRequest.recipientType.DESTINATION_CHAIN,
      depositType: sourceToken.isIntent ? QuoteRequest.depositType.INTENTS : QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: sourceToken.isIntent ? intentsAccountId : targetWalletAddress,
      refundType: sourceToken.isIntent ? QuoteRequest.refundType.INTENTS : QuoteRequest.refundType.ORIGIN_CHAIN,
    };
  }
}

// Global registry instance
export const quoteBuilderRegistry = new QuoteBuilderRegistry();