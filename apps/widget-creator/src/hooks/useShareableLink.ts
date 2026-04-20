const SHARABLE_LINK_BASE_URL = 'https://intents.aurora.dev';

const getBaseDomain = (): string => {
  if (typeof window === 'undefined') {
    return SHARABLE_LINK_BASE_URL;
  }

  const { origin } = window.location;

  // use parent url for our internal testing and for all the customers' apps
  // it must be intents.aurora.dev
  return origin.includes('localhost') ||
    origin.includes('auroraisnear.vercel.app') ||
    origin.includes('staging-intents.aurora.dev')
    ? origin
    : SHARABLE_LINK_BASE_URL;
};

export const useShareableLink = (
  configId: string | null,
  apiKey: string | null,
): string | null => {
  if (!configId || !apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    apiKey,
    configId,
    embed: 'true',
  });

  return `${getBaseDomain()}?${params.toString()}`;
};
