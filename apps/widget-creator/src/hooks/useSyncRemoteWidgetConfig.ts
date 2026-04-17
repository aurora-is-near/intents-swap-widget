import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useCurrentWidgetConfig } from '@/api/hooks/useCurrentWidgetConfig';
import type { RequestBody } from '@/api/requests/createWidgetConfig';

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

export const useSyncRemoteWidgetConfig = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}): { body: RequestBody } | null => {
  const { authenticated } = usePrivy();
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const { data: currentWidgetConfig, status: currentWidgetConfigStatus } =
    useCurrentWidgetConfig({ enabled });

  const remoteWidgetConfigPayload = useMemo(() => {
    const { apiKey: _apiKey, ...configWithoutApiKey } = widgetConfig;

    return stripUndefined({
      config: configWithoutApiKey,
      theme: themeConfig,
    }) as RequestBody;
  }, [themeConfig, widgetConfig]);

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

  return useMemo(() => {
    if (
      !enabled ||
      !authenticated ||
      currentWidgetConfigStatus !== 'success' ||
      !currentWidgetConfig ||
      !hasRemoteConfigChanged
    ) {
      return null;
    }

    return { body: remoteWidgetConfigPayload };
  }, [
    authenticated,
    currentWidgetConfig,
    currentWidgetConfigStatus,
    enabled,
    hasRemoteConfigChanged,
    remoteWidgetConfigPayload,
  ]);
};
