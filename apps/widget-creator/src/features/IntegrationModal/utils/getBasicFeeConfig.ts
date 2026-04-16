import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

export const getBasicFeeConfig = (
  bps: number,
  recipient: string,
): Omit<FeeConfig, 'default_fee'> & { default_fee: Fee } => {
  return {
    version: '1.0.0',
    rules: [],
    default_fee: {
      bps,
      recipient,
      type: 'bps',
    },
  };
};
