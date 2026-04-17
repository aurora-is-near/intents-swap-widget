import { z } from 'zod';
import { RuleEngine } from 'intents-1click-rule-engine';
import type { FeeConfig } from 'intents-1click-rule-engine';

import type {
  ApiKey,
  SerializableTheme,
  SerializableWidgetConfig,
  WidgetConfigRecord,
} from './types';

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

export const apiKeySchema: z.ZodSchema<ApiKey> = z
  .object({
    isEnabled: z.boolean(),
    createdAt: z.string(),
    widgetAppKey: z.string(),
    feeRules: FeeConfigSchema,
    role: z.enum(['admin']).optional(),
  })
  .transform((data) => ({
    ...data,
    widgetApiKey: data.widgetAppKey,
  }));

const chainsSchema = z.enum([
  'eth',
  'bera',
  'base',
  'gnosis',
  'arb',
  'bsc',
  'avax',
  'op',
  'pol',
  'monad',
  'sui',
  'xrp',
  'btc',
  'doge',
  'tron',
  'ton',
  'near',
  'sol',
  'zec',
  'ltc',
  'cardano',
  'stellar',
]);

const walletAddressKeySchema = z.enum([
  'eth',
  'bera',
  'base',
  'gnosis',
  'arb',
  'bsc',
  'avax',
  'op',
  'pol',
  'monad',
  'sui',
  'xrp',
  'btc',
  'doge',
  'tron',
  'ton',
  'near',
  'sol',
  'zec',
  'ltc',
  'cardano',
  'stellar',
  'default',
]);

const defaultTokenSchema = z.object({
  symbol: z.string(),
  blockchain: chainsSchema,
});

const appFeeSchema = z.object({
  recipient: z.string(),
  fee: z.number().finite(),
});

const chainFilterSchema = z.object({
  intents: z.enum(['none', 'all', 'with-balance']),
  external: z.enum(['none', 'all', 'wallet-supported']),
});

const chainsFiltersSchema = z.object({
  target: chainFilterSchema,
  source: chainFilterSchema,
});

const hexColorSchema = z.custom<`#${string}`>(
  (value) =>
    typeof value === 'string' &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
      value,
    ),
);

export const widgetThemeSchema: z.ZodType<SerializableTheme> = z
  .object({
    colorScheme: z.enum(['light', 'dark']).optional(),
    stylePreset: z.enum(['clean', 'bold']).optional(),
    accentColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),
    successColor: hexColorSchema.optional(),
    warningColor: hexColorSchema.optional(),
    errorColor: hexColorSchema.optional(),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    showContainer: z.boolean().optional(),
  })
  .strict();

export const widgetConfigSchema: z.ZodType<SerializableWidgetConfig> = z
  .object({
    apiKey: z.string().optional(),
    referral: z.string().optional(),
    enableAccountAbstraction: z.boolean().optional(),
    walletSupportedChains: z.array(chainsSchema).readonly().optional(),
    connectedWallets: z.partialRecord(
      walletAddressKeySchema,
      z.string().nullable(),
    ),
    sendAddress: z.string().nullable().optional(),
    slippageTolerance: z.number().finite(),
    enableAutoTokensSwitching: z.boolean().optional(),
    refetchQuoteInterval: z.number().finite().optional(),
    appFees: z.array(appFeeSchema).optional(),
    defaultSourceToken: defaultTokenSchema.nullable().optional(),
    defaultTargetToken: defaultTokenSchema.nullable().optional(),
    allowedTokensList: z.array(z.string()).optional(),
    allowedSourceTokensList: z.array(z.string()).optional(),
    allowedTargetTokensList: z.array(z.string()).optional(),
    priorityAssets: z
      .union([
        z.array(z.string()).readonly(),
        z.array(z.tuple([chainsSchema, z.string()])).readonly(),
      ])
      .optional(),
    disabledInternalBalanceTokens: z.array(z.string()).optional(),
    chainsOrder: z.array(chainsSchema),
    allowedChainsList: z.array(chainsSchema).optional(),
    allowedSourceChainsList: z.array(chainsSchema).optional(),
    allowedTargetChainsList: z.array(chainsSchema).optional(),
    chainsFilter: chainsFiltersSchema.optional(),
    alchemyApiKey: z.string().optional(),
    tonCenterApiKey: z.string().optional(),
    showProfileButton: z.boolean().optional(),
    hideSendAddress: z.boolean().optional(),
    hideTokenInputHeadings: z.boolean().optional(),
    themeParentElementSelector: z.string().optional(),
    lockSwapDirection: z.boolean().optional(),
    showTransactionHistory: z.boolean().optional(),
    showConversionPreview: z.boolean().optional(),
  })
  .strict();

export const widgetConfigRecordSchema: z.ZodType<WidgetConfigRecord> = z
  .object({
    uuid: z.uuid(),
    config: widgetConfigSchema,
    theme: widgetThemeSchema,
    createdAt: z.string(),
  })
  .strict();
