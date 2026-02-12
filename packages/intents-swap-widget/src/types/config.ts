import { Quote, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { Chains, ChainsFilters } from './chain';
import { SimpleToken, Token } from './token';
import { FetchQuoteOptions } from './quote';
import { Providers } from './providers';

export type WalletAddresses = Partial<
  Record<Chains | 'default', string | null>
>;

export type IntentsAccountType = 'evm' | 'near' | 'sol';

export type DefaultToken = Pick<Token, 'symbol' | 'blockchain'>;

export type PriorityAssets =
  | ReadonlyArray<string>
  | ReadonlyArray<readonly [Chains, string]>;

export type WidgetConfig = {
  // Application metadata
  appName: string;
  appIcon?: string;
  apiKey?: string;

  // Account abstraction
  enableAccountAbstraction?: boolean;

  // Providers
  providers?: Providers;

  // Connected wallet
  walletSupportedChains?: ReadonlyArray<Chains>;
  connectedWallets: WalletAddresses;
  onWalletSignout?: (walletType?: IntentsAccountType) => void;
  onWalletSignin?: () => void;

  // Destination wallet
  sendAddress?: string | null;

  // Quotes & Transfers
  slippageTolerance: number;
  enableAutoTokensSwitching?: boolean;
  refetchQuoteInterval?: number;
  appFees?: {
    recipient: string;
    fee: number;
  }[];

  // Default tokens
  defaultSourceToken?: DefaultToken | null;
  defaultTargetToken?: DefaultToken | null;

  // Tokens filtering
  allowedTokensList?: string[]; // assetIDs
  allowedSourceTokensList?: string[];
  allowedTargetTokensList?: string[];
  priorityAssets?: PriorityAssets;
  filterTokens: (token: Token) => boolean;

  // Chains filtering
  chainsOrder: Chains[];
  allowedChainsList?: Chains[];
  allowedSourceChainsList?: Chains[];
  allowedTargetChainsList?: Chains[];
  topChainShortcuts?: (
    intentsAccountType?: IntentsAccountType,
  ) => [Chains, Chains, Chains, Chains];
  chainsFilter?: ChainsFilters;

  // API
  fetchQuote?: (
    data: QuoteRequest,
    options: FetchQuoteOptions,
  ) => Promise<Quote>;
  fetchSourceTokens?: () => Promise<SimpleToken[]>;
  fetchTargetTokens?: () => Promise<SimpleToken[]>;

  // Balance loading
  alchemyApiKey?: string;
  tonCenterApiKey?: string;

  // UI
  showProfileButton?: boolean;
  hideSendAddress?: boolean;
  hideTokenInputHeadings?: boolean;
  themeParentElementSelector?: string;
  lockSwapDirection?: boolean;
};
