import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { DEFAULT_APP_KEY } from '@/constants';
import { useApiKeys, useCurrentWidgetConfig } from '@/api/hooks';

const SHARABLE_LINK_BASE_URL = 'https://intents.aurora.dev';

export const useSharableLink = () => {
  const { authenticated } = usePrivy();
  const { data: apiKeys } = useApiKeys();
  const { data: currentWidgetConfig } = useCurrentWidgetConfig();
  const [isPreparingSharableLink, setIsPreparingSharableLink] = useState(false);

  const selectedApiKey = apiKeys?.[0]?.widgetApiKey ?? DEFAULT_APP_KEY;

  const currentDomain =
    typeof window !== 'undefined' &&
    (window.location.origin.includes('localhost') ||
      window.location.origin.includes('auroraisnear.vercel.app'))
      ? window.location.origin
      : SHARABLE_LINK_BASE_URL;

  const getSharableLink = async () => {
    if (!authenticated || !selectedApiKey || !currentWidgetConfig) {
      return null;
    }

    setIsPreparingSharableLink(true);

    try {
      const params = new URLSearchParams({
        configId: currentWidgetConfig.uuid,
        apiKey: selectedApiKey,
        embed: 'true',
      });

      return `${currentDomain}?${params.toString()}`;
    } finally {
      setIsPreparingSharableLink(false);
    }
  };

  const copySharableLink = async () => {
    const sharableLink = await getSharableLink();

    if (!sharableLink) {
      return null;
    }

    if (!navigator.clipboard?.writeText) {
      return null;
    }

    try {
      await navigator.clipboard.writeText(sharableLink);
    } catch {
      return null;
    }

    return sharableLink;
  };

  return {
    copySharableLink,
    getSharableLink,
    isSharableLinkAvailable: Boolean(
      authenticated && selectedApiKey && currentWidgetConfig,
    ),
    isPreparingSharableLink,
  };
};
