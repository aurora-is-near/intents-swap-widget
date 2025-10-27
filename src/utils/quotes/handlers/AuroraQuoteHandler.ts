import type {
  QuoteBuilderContext,
  QuoteParams,
  BlockchainQuoteHandler,
} from '@/types/quoteBuilder';
import { logger } from '@/logger';
import { isAuroraToken, isAuroraChain } from '@/utils/aurora/isAurora';
import {
  buildAuroraDepositParams,
  buildAuroraOutOfVCParams,
  buildAuroraIntoVCParams,
  buildSwapQuoteParams,
} from '@/utils/aurora/quoteHelpers';
import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';

export class AuroraQuoteHandler implements BlockchainQuoteHandler {
  readonly priority = 100; // High priority for Aurora-specific scenarios

  canHandle(context: QuoteBuilderContext): boolean {
    const { sourceToken, targetToken } = context;
    
    // Handle any scenario involving Aurora blockchain
    return (
      isAuroraToken(sourceToken) || 
      isAuroraToken(targetToken) ||
      isAuroraChain(sourceToken.blockchain) ||
      isAuroraChain(targetToken.blockchain)
    );
  }

  buildQuoteParams(context: QuoteBuilderContext): QuoteParams {
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

    logger.debug(`[AuroraHandler] Building quote for ${sourceToken.blockchain} -> ${targetToken.blockchain}`);

    const commonQuoteParams = {
      // Settings
      dry: isDry,
      slippageTolerance: 100, // 1%
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      swapType: quoteType === 'exact_out' ? QuoteRequest.swapType.EXACT_OUTPUT : QuoteRequest.swapType.EXACT_INPUT,
      
      // Assets
      originAsset: sourceToken.assetId,
      destinationAsset: targetToken.assetId,
      amount: quoteType === 'exact_out' ? context.targetTokenAmount : context.sourceTokenAmount,
    };

    if (message) {
      // @ts-expect-error customRecipientMsg is not in the types
      commonQuoteParams.customRecipientMsg = message;
    }

    // Aurora Out of VC: Aurora -> NEAR/External
    if (isAuroraToken(sourceToken) && targetToken.blockchain === 'near') {
      logger.debug(`[AuroraHandler] Aurora Out of VC transfer`);
      return buildAuroraOutOfVCParams({
        commonQuoteParams,
        targetToken,
        sendAddress,
        intentsAccountId,
        targetWalletAddress,
      });
    }

    // Aurora Into VC: NEAR/Intents -> Aurora  
    if (!isAuroraToken(sourceToken) && isAuroraToken(targetToken) && sourceToken.isIntent) {
      logger.debug(`[AuroraHandler] Aurora Into VC transfer`);
      return buildAuroraIntoVCParams({
        commonQuoteParams,
        targetToken,
        sendAddress,
        targetWalletAddress,
        intentsAccountId,
        depositType: QuoteRequest.depositType.INTENTS,
      });
    }

    // Aurora Deposit: External -> Aurora (via NEAR bridge)
    if (!sourceToken.isIntent && !isAuroraToken(sourceToken) && isAuroraToken(targetToken)) {
      logger.debug(`[AuroraHandler] Aurora deposit from external chain`);
      
      // Find the corresponding NEAR token for this Aurora token
      // This would need to be implemented based on your token mapping logic
      const destinationAssetId = targetToken.assetId; // Simplified for now
      
      return buildAuroraDepositParams({
        commonQuoteParams,
        intentsAccountId,
        destinationAssetId,
        targetWalletAddress,
      });
    }

    // General Aurora swap scenarios
    if (isAuroraToken(sourceToken) || isAuroraToken(targetToken)) {
      logger.debug(`[AuroraHandler] General Aurora swap`);
      return buildSwapQuoteParams({
        commonQuoteParams,
        sourceToken,
        targetToken,
        intentsAccountId,
        sendAddress,
        targetWalletAddress,
      });
    }

    // Fallback - should not reach here if canHandle is correct
    logger.warn(`[AuroraHandler] Unexpected token combination, using default params`);
    return commonQuoteParams;
  }
}