const SHARABLE_LINK_BASE_URL = 'https://intents.aurora.dev';

const getBaseDomain = (): string => {
  if (typeof window === 'undefined') {
    return SHARABLE_LINK_BASE_URL;
  }

  const { origin } = window.location;

  return origin.includes('localhost') ||
    origin.includes('auroraisnear.vercel.app')
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
