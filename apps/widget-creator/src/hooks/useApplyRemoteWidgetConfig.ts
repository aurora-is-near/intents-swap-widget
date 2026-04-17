import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCurrentWidgetConfig } from '@/api/hooks';
import { useCreator } from '@/hooks/useCreatorConfig';

export const useApplyRemoteWidgetConfig = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const { authenticated, user } = usePrivy();

  const { dispatch } = useCreator();

  const { data: currentWidgetConfig, status: currentWidgetConfigStatus } =
    useCurrentWidgetConfig({ enabled });

  const appliedRemoteConfigKeyRef = useRef<string | null>(null);

  useEffect(() => {
    appliedRemoteConfigKeyRef.current = null;
  }, [enabled, user?.id]);

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
    isRemoteWidgetConfigApplied:
      enabled &&
      authenticated &&
      currentWidgetConfigStatus === 'success' &&
      Boolean(currentWidgetConfig) &&
      appliedRemoteConfigKeyRef.current ===
        `${user?.id}:${currentWidgetConfig?.uuid}`,
    isRemoteWidgetConfigLoading:
      enabled && authenticated && currentWidgetConfigStatus === 'pending',
  };
};
