import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCreateWidgetConfig, useCurrentWidgetConfig } from '@/api/hooks';
import { FeeServiceCreateWidgetConfigError } from '@/api/errors';
import { useCreator } from '@/hooks/useCreatorConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';

export const useApplyRemoteWidgetConfig = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const { authenticated, user } = usePrivy();
  const { dispatch } = useCreator();
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const {
    data: currentWidgetConfig,
    error: currentWidgetConfigError,
    refetch: refetchCurrentWidgetConfig,
    status: currentWidgetConfigStatus,
  } = useCurrentWidgetConfig({ enabled });

  const createWidgetConfigMutation = useCreateWidgetConfig();
  const {
    mutateAsync,
    reset,
    status: createWidgetConfigStatus,
  } = createWidgetConfigMutation;

  const appliedRemoteConfigKeyRef = useRef<string | null>(null);
  const attemptedCreateConfigKeyRef = useRef<string | null>(null);

  const remoteWidgetConfigPayload = useMemo(() => {
    const { apiKey: _apiKey, ...configWithoutApiKey } = widgetConfig;

    return {
      config: configWithoutApiKey,
      theme: themeConfig,
    };
  }, [themeConfig, widgetConfig]);

  useEffect(() => {
    appliedRemoteConfigKeyRef.current = null;
    attemptedCreateConfigKeyRef.current = null;
    reset();
  }, [enabled, reset, user?.id]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!authenticated || currentWidgetConfigStatus !== 'error') {
      return;
    }

    if (currentWidgetConfigError?.code !== 'WIDGET_CONFIG_NOT_FOUND') {
      return;
    }

    if (
      createWidgetConfigStatus === 'pending' ||
      createWidgetConfigStatus === 'success'
    ) {
      return;
    }

    if (!user?.id || attemptedCreateConfigKeyRef.current === user.id) {
      return;
    }

    attemptedCreateConfigKeyRef.current = user.id;

    void mutateAsync(remoteWidgetConfigPayload).catch((error: unknown) => {
      if (
        error instanceof FeeServiceCreateWidgetConfigError &&
        error.code === 'WIDGET_CONFIG_ALREADY_EXISTS'
      ) {
        void refetchCurrentWidgetConfig();
      }
    });
  }, [
    authenticated,
    createWidgetConfigStatus,
    currentWidgetConfigError,
    currentWidgetConfigStatus,
    mutateAsync,
    refetchCurrentWidgetConfig,
    remoteWidgetConfigPayload,
    user?.id,
  ]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      !authenticated ||
      currentWidgetConfigStatus !== 'success' ||
      !user?.id ||
      !currentWidgetConfig
    ) {
      return;
    }

    const appliedRemoteConfigKey = `${user.id}:${currentWidgetConfig.uuid}`;

    if (appliedRemoteConfigKeyRef.current === appliedRemoteConfigKey) {
      return;
    }

    dispatch({
      type: 'APPLY_REMOTE_WIDGET_CONFIG',
      payload: {
        config: currentWidgetConfig.config,
        theme: currentWidgetConfig.theme,
      },
    });

    appliedRemoteConfigKeyRef.current = appliedRemoteConfigKey;
  }, [
    authenticated,
    currentWidgetConfig,
    currentWidgetConfigStatus,
    dispatch,
    enabled,
    user?.id,
  ]);

  return {
    currentWidgetConfig,
    hasRemoteWidgetConfig: Boolean(currentWidgetConfig),
    isRemoteWidgetConfigLoading:
      enabled &&
      authenticated &&
      (currentWidgetConfigStatus === 'pending' ||
        (currentWidgetConfigError?.code === 'WIDGET_CONFIG_NOT_FOUND' &&
          createWidgetConfigStatus !== 'error')),
  };
};
