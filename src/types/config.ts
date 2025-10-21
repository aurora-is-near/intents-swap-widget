import { Chains, DefaultChainsFilter } from './chain';
import { Token } from './token';

export type WidgetConfig = {
  // Application metadata
  appName: string;
  appIcon: string;

  // Connected wallet
  intentsAccountType: 'evm' | 'near' | 'sol';
  walletSupportedChains: ReadonlyArray<Chains>;
  walletAddress?: string | null;

  // Quotes & Transfers
  defaultMaxSlippage: number;
  enableAutoTokensSwitching?: boolean;

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
    source: DefaultChainsFilter;
    target: DefaultChainsFilter;
  };

  // 1Click API
  oneClickApiQuoteProxyUrl: string;
};
