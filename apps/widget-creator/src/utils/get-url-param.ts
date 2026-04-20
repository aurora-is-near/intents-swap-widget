import type { SerializableWidgetConfig } from '@/api/types';

export const getUrlParam = (param: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get(param);
};

export const getUrlBooleanParam = (param: string): boolean => {
  const value = getUrlParam(param);

  return value === 'true' || value === '1';
};

export type ConfigOverrides = Pick<
  SerializableWidgetConfig,
  'extraQuoteParameters'
>;

const EXTRA_QUOTE_PARAM_KEYS = [
  'sessionId',
  'virtualChainRecipient',
  'virtualChainRefundRecipient',
] as const;

export const getConfigOverridesFromUrl = (): ConfigOverrides | null => {
  const extraQuoteParameters: Record<string, string> = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const key of EXTRA_QUOTE_PARAM_KEYS) {
    const value = getUrlParam(`cfg.extraQuoteParameters.${key}`);

    if (value !== null) {
      extraQuoteParameters[key] = value;
    }
  }

  if (Object.keys(extraQuoteParameters).length === 0) {
    return null;
  }

  return { extraQuoteParameters };
};
