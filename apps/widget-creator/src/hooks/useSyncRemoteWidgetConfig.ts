import { useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCurrentWidgetConfig } from '@/api/hooks/useCurrentWidgetConfig';
import { useUpdateWidgetConfig } from '@/api/hooks/useUpdateWidgetConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';

const SYNC_DEBOUNCE_MS = 400;

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => [key, stripUndefined(nestedValue)] as const)
      .filter(([, nestedValue]) => nestedValue !== undefined);

    return Object.fromEntries(entries);
  }

  return value;
};

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(
      ([key, nestedValue]) =>
        `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`,
    );

  return `{${entries.join(',')}}`;
};

export const useSyncRemoteWidgetConfig = () => {
  const { authenticated } = usePrivy();
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const {
    data: currentWidgetConfig,
    error: currentWidgetConfigError,
    status: currentWidgetConfigStatus,
  } = useCurrentWidgetConfig();

  const remoteWidgetConfigPayload = useMemo(() => {
    const { apiKey: _apiKey, ...configWithoutApiKey } = widgetConfig;

    return stripUndefined({
      config: configWithoutApiKey,
      theme: themeConfig,
    }) as {
      config: typeof configWithoutApiKey;
      theme: typeof themeConfig;
    };
  }, [themeConfig, widgetConfig]);

  const updateWidgetConfigMutation = useUpdateWidgetConfig(
    currentWidgetConfig?.uuid ?? '',
  );

  const currentRemotePayload = useMemo(() => {
    if (!currentWidgetConfig) {
      return null;
    }

    return stripUndefined({
      config: currentWidgetConfig.config,
      theme: currentWidgetConfig.theme,
    });
  }, [currentWidgetConfig]);

  const remoteWidgetConfigPayloadSignature = useMemo(
    () => stableSerialize(remoteWidgetConfigPayload),
    [remoteWidgetConfigPayload],
  );

  const currentRemotePayloadSignature = useMemo(() => {
    if (!currentRemotePayload) {
      return null;
    }

    return stableSerialize(currentRemotePayload);
  }, [currentRemotePayload]);

  const hasRemoteConfigChanged = useMemo(() => {
    if (!currentRemotePayloadSignature) {
      return false;
    }

    return currentRemotePayloadSignature !== remoteWidgetConfigPayloadSignature;
  }, [currentRemotePayloadSignature, remoteWidgetConfigPayloadSignature]);

  const {
    mutateAsync,
    reset,
    status: updateStatus,
  } = updateWidgetConfigMutation;

  useEffect(() => {
    if (!authenticated || currentWidgetConfigStatus !== 'success') {
      return;
    }

    if (!currentWidgetConfig || !hasRemoteConfigChanged) {
      return;
    }

    if (updateStatus === 'pending') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void mutateAsync(remoteWidgetConfigPayload);
    }, SYNC_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    authenticated,
    currentWidgetConfig,
    currentWidgetConfigStatus,
    hasRemoteConfigChanged,
    mutateAsync,
    remoteWidgetConfigPayload,
    updateStatus,
  ]);

  useEffect(() => {
    if (currentWidgetConfigStatus !== 'error') {
      return;
    }

    if (currentWidgetConfigError?.code !== 'WIDGET_CONFIG_NOT_FOUND') {
      return;
    }

    reset();
  }, [currentWidgetConfigError, currentWidgetConfigStatus, reset]);
};
