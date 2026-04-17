import type { Theme, WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import type { FeeConfig } from 'intents-1click-rule-engine';

export type ApiKey = {
  isEnabled: boolean;
  createdAt: string;
  widgetApiKey: string;
  feeRules: FeeConfig;
  role?: 'admin';
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
  | 'showConversionPreview';

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
};
