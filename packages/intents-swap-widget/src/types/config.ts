import { Quote, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { Chains, ChainsFilter } from './chain';
import { SimpleToken, Token } from './token';
import { FetchQuoteOptions } from './quote';

export type WalletAddresses = Partial<
  Record<Chains | 'default', string | null>
>;

export type IntentsAccountType = 'evm' | 'near' | 'sol';

export type PriorityAssets =
  | ReadonlyArray<string>
  | ReadonlyArray<readonly [Chains, string]>;

export type WidgetConfig = {
  // Application metadata
  appName: string;
  appIcon?: string;

  // Connected wallet
  intentsAccountType?: IntentsAccountType;
  walletSupportedChains: ReadonlyArray<Chains>;
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

  // Tokens filtering
  showIntentTokens: boolean;
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
  chainsFilter: {
    source: ChainsFilter;
    target: ChainsFilter;
  };

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
  hideSendAddress?: boolean;
  hideTokenInputHeadings?: boolean;
  themeParentElementSelector?: string;
};
