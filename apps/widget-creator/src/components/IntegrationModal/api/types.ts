import { FeeConfig } from 'intents-1click-rule-engine';

export type ApiKey = {
  isEnabled: boolean;
  createdAt: string;
  widgetAppKey: string;
  feeRules: FeeConfig;
};
