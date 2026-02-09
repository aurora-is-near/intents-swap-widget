import { z } from 'zod';
import { RuleEngine } from 'intents-1click-rule-engine';
import type { FeeConfig } from 'intents-1click-rule-engine';

import type { ApiKey } from './types';

export const FeeConfigSchema = z.any().superRefine((data, ctx) => {
  if (data == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Fee configuration must be provided',
    });

    return;
  }

  if (typeof data !== 'object') {
    ctx.addIssue({
      code: 'custom',
      message: 'Fee configuration must be an object',
    });

    return;
  }

  try {
    // Allow empty recipient address if default fee is set to 0
    if (
      (!data.rules || data.rules.length === 0) &&
      !data.default_fee?.recipient &&
      data.default_fee?.bps === 0
    ) {
      // eslint-disable-next-line no-new
      new RuleEngine({
        ...data,
        default_fee: {
          ...data.default_fee,
          recipient: 'placeholder-recipient-address',
        },
      } as FeeConfig);
    } else {
      // eslint-disable-next-line no-new
      new RuleEngine(data as FeeConfig);
    }
  } catch (error: unknown) {
    ctx.addIssue({
      code: 'custom',
      message:
        error instanceof Error
          ? error.message
          : 'Invalid fee configuration. Check your rules, matchers, and fee structure.',
    });
  }
}) as z.ZodType<FeeConfig>;

export const apiKeySchema: z.ZodSchema<ApiKey> = z.object({
  isEnabled: z.boolean(),
  createdAt: z.string(),
  widgetApiKey: z.string(),
  feeRules: FeeConfigSchema,
});
