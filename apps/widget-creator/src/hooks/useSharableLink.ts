import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { useApiKeys } from '@/api/hooks';
import {
  FeeServiceCreateWidgetConfigError,
  FeeServiceGetWidgetConfigError,
} from '@/api/errors';
import { createWidgetConfig } from '@/api/requests/createWidgetConfig';
import { getCurrentWidgetConfig } from '@/api/requests/getCurrentWidgetConfig';
import type { WidgetConfigRecord } from '@/api/types';
import { useCreator } from '@/hooks/useCreatorConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';

const SHARABLE_LINK_BASE_URL = 'https://intents.aurora.dev';

export const useSharableLink = () => {
  const queryClient = useQueryClient();
  const { authenticated, getAccessToken, user } = usePrivy();
  const { data: apiKeys } = useApiKeys();
  const { state } = useCreator();
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const [isPreparingSharableLink, setIsPreparingSharableLink] = useState(false);

  const selectedApiKey = state.apiKey || apiKeys?.[0]?.widgetApiKey;

  const remoteWidgetConfigPayload = useMemo(() => {
    const { apiKey: _apiKey, ...configWithoutApiKey } = widgetConfig;

    return {
      config: configWithoutApiKey,
      theme: themeConfig,
    };
  }, [themeConfig, widgetConfig]);

  const currentWidgetConfigQueryKey = [
    'widgetConfig',
    'current',
    user?.id ?? 'anonymous',
  ] as const;

  const getSharableLink = async () => {
    if (!authenticated || !selectedApiKey) {
      return null;
    }

    const authToken = await getAccessToken();

    if (!authToken) {
      return null;
    }

    setIsPreparingSharableLink(true);

    try {
      let remoteWidgetConfig = queryClient.getQueryData<WidgetConfigRecord>(
        currentWidgetConfigQueryKey,
      );

      if (!remoteWidgetConfig) {
        try {
          remoteWidgetConfig = await getCurrentWidgetConfig(authToken);
        } catch (error: unknown) {
          if (
            error instanceof FeeServiceGetWidgetConfigError &&
            error.code === 'WIDGET_CONFIG_NOT_FOUND'
          ) {
            try {
              remoteWidgetConfig = await createWidgetConfig(
                authToken,
                remoteWidgetConfigPayload,
              );
            } catch (createError: unknown) {
              if (
                createError instanceof FeeServiceCreateWidgetConfigError &&
                createError.code === 'WIDGET_CONFIG_ALREADY_EXISTS'
              ) {
                remoteWidgetConfig = await getCurrentWidgetConfig(authToken);
              } else {
                throw createError;
              }
            }
          } else {
            throw error;
          }
        }
      }

      if (!remoteWidgetConfig) {
        return null;
      }

      queryClient.setQueryData(
        ['widgetConfig', remoteWidgetConfig.uuid],
        remoteWidgetConfig,
      );
      queryClient.setQueryData(currentWidgetConfigQueryKey, remoteWidgetConfig);

      const params = new URLSearchParams({
        configID: remoteWidgetConfig.uuid,
        apiKey: selectedApiKey,
      });

      return `${SHARABLE_LINK_BASE_URL}?${params.toString()}`;
    } finally {
      setIsPreparingSharableLink(false);
    }
  };

  const copySharableLink = async () => {
    const sharableLink = await getSharableLink();

    if (!sharableLink) {
      return null;
    }

    await navigator.clipboard.writeText(sharableLink);

    return sharableLink;
  };

  return {
    copySharableLink,
    getSharableLink,
    isPreparingSharableLink,
  };
};
