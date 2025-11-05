import { Quote, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { Chains, ChainsFilter } from './chain';
import { SimpleToken, Token } from './token';

export type WidgetConfig = {
  // Application metadata
  appName: string;
  appIcon: string;

  // Connected wallet
  intentsAccountType: 'evm' | 'near' | 'sol';
  walletSupportedChains: ReadonlyArray<Chains>;
  walletAddress?: string | null;

  // Destination wallet
  sendAddress?: string | null;

  // Quotes & Transfers
  defaultMaxSlippage: number;
  enableAutoTokensSwitching?: boolean;
  refetchQuoteInterval?: number;

  // Tokens filtering
  showIntentTokens: boolean;
  allowedTokensList?: string[]; // assetIDs
  allowedSourceTokensList?: string[];
  allowedTargetTokensList?: string[];
  filterTokens: (token: Token) => boolean;

  // Chains filtering
  chainsOrder: Chains[];
  allowedChainsList?: Chains[];
  allowedSourceChainsList?: Chains[];
  allowedTargetChainsList?: Chains[];
  chainsFilter: {
    source: ChainsFilter;
    target: ChainsFilter;
  };

  // API
  oneClickApiQuoteProxyUrl: string;
  fetchQuote?: (data: QuoteRequest) => Promise<Quote>;
  fetchSourceTokens?: () => Promise<SimpleToken[]>;
  fetchTargetTokens?: () => Promise<SimpleToken[]>;

  // Balance loading
  alchemyApiKey?: string;
  tonCenterApiKey?: string;

  // UI
  hideSendAddress?: boolean;
  hideTokenInputHeadings?: boolean;
};
