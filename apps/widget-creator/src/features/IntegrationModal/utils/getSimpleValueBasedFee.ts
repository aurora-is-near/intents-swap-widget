import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

export const getSimpleValueBasedFee = (
  feeRules: FeeConfig,
): Fee | undefined => {
  if (Array.isArray(feeRules.default_fee)) {
    return feeRules.default_fee[0];
  }

  return feeRules.default_fee;
};
