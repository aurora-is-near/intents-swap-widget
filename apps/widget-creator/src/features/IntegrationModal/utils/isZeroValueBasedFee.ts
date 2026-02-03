import type { FeeConfig } from 'intents-1click-rule-engine';

export const isZeroValueBasedFee = (feeRules: FeeConfig): boolean => {
  if (feeRules.rules.length > 0) {
    return false;
  }

  if (Array.isArray(feeRules.default_fee)) {
    return false;
  }

  return feeRules.default_fee.bps === 0;
};
