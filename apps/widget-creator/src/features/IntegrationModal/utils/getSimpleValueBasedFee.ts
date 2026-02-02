import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

export const getSimpleValueBasedFee = (
  feeRules: FeeConfig,
): Fee | undefined => {
  if (feeRules.rules.length === 0) {
    if (Array.isArray(feeRules.default_fee)) {
      return undefined;
    }

    return feeRules.default_fee;
  }

  return undefined;
};
