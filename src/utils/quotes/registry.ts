import { quoteBuilderRegistry } from './QuoteBuilderRegistry';
import { AuroraQuoteHandler } from './handlers/AuroraQuoteHandler';
import { logger } from '@/logger';

/**
 * Initialize and register all blockchain quote handlers
 * This is called once during app initialization
 */
export function initializeQuoteHandlers(): void {
  logger.debug('[QuoteRegistry] Initializing quote handlers...');
  
  // Register Aurora handler
  quoteBuilderRegistry.register(new AuroraQuoteHandler());
  
  logger.debug('[QuoteRegistry] Quote handlers initialized');
}

/**
 * Get the configured quote registry
 * This is the main entry point for the quote building system
 */
export function getQuoteRegistry() {
  return quoteBuilderRegistry;
}