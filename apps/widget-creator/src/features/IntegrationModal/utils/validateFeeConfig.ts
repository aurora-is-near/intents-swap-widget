import { RuleEngine } from 'intents-1click-rule-engine';
import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

type ReducedFeeConfig = Omit<FeeConfig, 'default_fee'> & { default_fee: Fee };

export const validateFeeConfig = (
  feeJson: string,
):
  | { data: ReducedFeeConfig; error: undefined }
  | { data: undefined; error: string } => {
  let rules: ReducedFeeConfig;

  try {
    rules = JSON.parse(feeJson) as ReducedFeeConfig;
    // eslint-disable-next-line no-new
    new RuleEngine(rules);

    let defaultFee: Fee | undefined;

    if (Array.isArray(rules.default_fee)) {
      [defaultFee] = rules.default_fee;
    } else {
      defaultFee = rules.default_fee;
    }

    if (!defaultFee) {
      return { data: undefined, error: 'Default fee is required' };
    }

    if (defaultFee.bps > 100) {
      return {
        data: undefined,
        error: 'Default fee cannot be greater than 1%',
      };
    }

    return { data: { ...rules, default_fee: defaultFee }, error: undefined };
  } catch (error) {
    if (feeJson) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid fee config')) {
          return { data: undefined, error: error.message };
        }

        return { data: undefined, error: `Syntax: ${error.message}` };
      }

      return { data: undefined, error: 'Invalid JSON configuration' };
    }

    return { data: undefined, error: 'No JSON configuration provided' };
  }
};
