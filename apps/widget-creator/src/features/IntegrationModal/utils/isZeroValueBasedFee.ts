import type { FeeConfig } from 'intents-1click-rule-engine';

import { getSimpleValueBasedFee } from './getSimpleValueBasedFee';

export const isZeroValueBasedFee = (feeRules: FeeConfig): boolean => {
  const isValueBasedFee = getSimpleValueBasedFee(feeRules);

  if (!isValueBasedFee) {
    return false;
  }

  return isValueBasedFee.bps === 0;
};
