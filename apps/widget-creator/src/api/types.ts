import type { Theme, WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import type { FeeConfig } from 'intents-1click-rule-engine';

export type ApiKey = {
  isEnabled: boolean;
  createdAt: string;
  apiKey: string;
  feeRules: FeeConfig;
  auroraFeeBps?: number | null;
  auroraFeePercent?: number | null;
  role?: 'admin';
};

// Whether the authenticated user has accepted the Terms & Conditions. Acceptance
// is recorded server-side when a key is created; the terms version/timestamp are
// internal audit fields and never sent to the client, so this is a bare boolean.
export type TosAcceptance = {
  accepted: boolean;
};

type SerializableWidgetConfigKeys =
  | 'apiKey'
  | 'referral'
  | 'enableAccountAbstraction'
  | 'walletSupportedChains'
  | 'connectedWallets'
  | 'sendAddress'
  | 'slippageTolerance'
  | 'enableAutoTokensSwitching'
  | 'refetchQuoteInterval'
  | 'appFees'
  | 'defaultSourceToken'
  | 'defaultTargetToken'
  | 'allowedTokensList'
  | 'allowedSourceTokensList'
  | 'allowedTargetTokensList'
  | 'priorityAssets'
  | 'disabledInternalBalanceTokens'
  | 'chainsOrder'
  | 'allowedChainsList'
  | 'allowedSourceChainsList'
  | 'allowedTargetChainsList'
  | 'chainsFilter'
  | 'alchemyApiKey'
  | 'tonCenterApiKey'
  | 'showProfileButton'
  | 'hideSendAddress'
  | 'hideTokenInputHeadings'
  | 'themeParentElementSelector'
  | 'lockSwapDirection'
  | 'showTransactionHistory'
  | 'showConversionPreview'
  | 'extraQuoteParameters'
  | 'confidentialMode'
  | 'allowSwapWithExternalWallet';

export type SerializableWidgetConfig = Pick<
  WidgetConfig,
  SerializableWidgetConfigKeys
>;

type SerializableThemeKeys =
  | 'colorScheme'
  | 'stylePreset'
  | 'accentColor'
  | 'backgroundColor'
  | 'successColor'
  | 'warningColor'
  | 'errorColor'
  | 'borderRadius'
  | 'showContainer';

export type SerializableTheme = Pick<Theme, SerializableThemeKeys>;

export type WidgetConfigRecord = {
  uuid: string;
  config: SerializableWidgetConfig;
  theme: SerializableTheme;
  createdAt: string;
  lastTimeUsed: string | null;
};
