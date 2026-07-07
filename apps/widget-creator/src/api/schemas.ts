import { z } from 'zod';
import { RuleEngine } from 'intents-1click-rule-engine';
import type { FeeConfig } from 'intents-1click-rule-engine';
import { CHAINS } from '@aurora-is-near/intents-swap-widget';

import type {
  ApiKey,
  SerializableTheme,
  SerializableWidgetConfig,
  TosAcceptance,
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
    apiKey: z.string(),
    feeRules: FeeConfigSchema,
    auroraFeeBps: z.number().int().nullish(),
    auroraFeePercent: z.number().int().nullish(),
    role: z.enum(['admin']).optional(),
  })
  .transform((data) => ({
    ...data,
    widgetApiKey: data.apiKey,
  }));

export const tosAcceptanceSchema: z.ZodType<TosAcceptance> = z.object({
  accepted: z.boolean(),
});

type ChainId = SerializableWidgetConfig['chainsOrder'][number];

const supportedChains = new Set<string>(CHAINS.map((chain) => chain.id));

const isSupportedChain = (chain: string): chain is ChainId =>
  supportedChains.has(chain);

const chainSchema = z
  .string()
  .refine(isSupportedChain)
  .transform((chain): ChainId => chain);

const chainsSchema = z
  .array(z.string())
  .transform((chains): ChainId[] => chains.filter(isSupportedChain));

const walletAddressKeySchema = z.union([chainSchema, z.literal('default')]);

const defaultTokenSchema = z.object({
  symbol: z.string(),
  blockchain: chainSchema,
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
    walletSupportedChains: chainsSchema.readonly().optional(),
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
        z.array(z.tuple([chainSchema, z.string()])).readonly(),
      ])
      .optional(),
    disabledInternalBalanceTokens: z.array(z.string()).optional(),
    chainsOrder: chainsSchema,
    allowedChainsList: chainsSchema.optional(),
    allowedSourceChainsList: chainsSchema.optional(),
    allowedTargetChainsList: chainsSchema.optional(),
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
    extraQuoteParameters: z
      .object({
        sessionId: z.string().optional(),
        virtualChainRecipient: z.string().optional(),
        virtualChainRefundRecipient: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export const widgetConfigRecordSchema: z.ZodType<WidgetConfigRecord> = z
  .object({
    uuid: z.uuid(),
    config: widgetConfigSchema,
    theme: widgetThemeSchema,
    createdAt: z.string(),
    lastTimeUsed: z.string().nullable(),
  })
  .strict();
