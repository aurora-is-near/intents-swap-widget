import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCurrentWidgetConfig } from '@/api/hooks';
import { useCreator } from '@/hooks/useCreatorConfig';

export const useApplyRemoteWidgetConfig = () => {
  const { authenticated, user } = usePrivy();
  const { dispatch } = useCreator();
  const { data: currentWidgetConfig, status: currentWidgetConfigStatus } =
    useCurrentWidgetConfig();

  const appliedRemoteConfigKeyRef = useRef<string | null>(null);

  useEffect(() => {
    appliedRemoteConfigKeyRef.current = null;
  }, [user?.id]);

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
};
