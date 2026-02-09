import type { FeeConfig } from 'intents-1click-rule-engine';

export type ApiKey = {
  isEnabled: boolean;
  createdAt: string;
  widgetApiKey: string;
  feeRules: FeeConfig;
};
