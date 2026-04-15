import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCreateWidgetConfig, useCurrentWidgetConfig } from '@/api/hooks';
import { FeeServiceCreateWidgetConfigError } from '@/api/errors';
import { useCreator } from '@/hooks/useCreatorConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';

export const useApplyRemoteWidgetConfig = () => {
  const { authenticated, user } = usePrivy();
  const { dispatch } = useCreator();
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const {
    data: currentWidgetConfig,
    error: currentWidgetConfigError,
    refetch: refetchCurrentWidgetConfig,
    status: currentWidgetConfigStatus,
  } = useCurrentWidgetConfig();

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
  }, [reset, user?.id]);

  useEffect(() => {
    if (!authenticated || currentWidgetConfigStatus !== 'error') {
      return;
    }

    if (currentWidgetConfigError?.code !== 'WIDGET_CONFIG_NOT_FOUND') {
      return;
    }

    const currentUserConfigKey = user?.id ?? 'anonymous';

    if (
      createWidgetConfigStatus === 'pending' ||
      createWidgetConfigStatus === 'success'
    ) {
      return;
    }

    if (attemptedCreateConfigKeyRef.current === currentUserConfigKey) {
      return;
    }

    attemptedCreateConfigKeyRef.current = currentUserConfigKey;

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
    if (!authenticated || currentWidgetConfigStatus !== 'success') {
      return;
    }

    if (!currentWidgetConfig) {
      return;
    }

    const appliedRemoteConfigKey = `${user?.id ?? 'anonymous'}:${currentWidgetConfig.uuid}`;

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
    user?.id,
  ]);

  return {
    currentWidgetConfig,
    hasRemoteWidgetConfig: Boolean(currentWidgetConfig),
    isRemoteWidgetConfigLoading:
      authenticated &&
      (currentWidgetConfigStatus === 'pending' ||
        (currentWidgetConfigError?.code === 'WIDGET_CONFIG_NOT_FOUND' &&
          createWidgetConfigStatus !== 'error')),
  };
};
