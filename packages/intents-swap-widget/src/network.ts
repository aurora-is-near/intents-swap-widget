import axios from 'axios';
import { snapshot } from 'valtio';
import { OpenAPI } from '@defuse-protocol/one-click-sdk-typescript';
import type { AxiosRequestConfig } from 'axios';

import { configStore } from '@/config';
import type { WidgetEnvironment } from '@/types/config';

OpenAPI.BASE = 'https://1click.chaindefuser.com';

const INTENTS_API_BASE_URLS: Record<WidgetEnvironment, string> = {
  production: 'https://intents-api.aurora.dev',
  staging: 'https://staging-intents-api.aurora.dev',
};

export const getIntentsApiBaseUrl = (): string => {
  const { environment = 'production' } = snapshot(configStore).config;

  return INTENTS_API_BASE_URLS[environment];
};

export const createNetworkClient = (config: AxiosRequestConfig = {}) => {
  return axios.create({
    timeout: 15_000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  });
};

export const bridgeApi = createNetworkClient({
  baseURL: 'https://bridge.chaindefuser.com/rpc',
});

export const oneClickApi = createNetworkClient();

export const alchemyApi = createNetworkClient({
  baseURL: 'https://api.g.alchemy.com/data/v1',
});

export const feeServiceApi = createNetworkClient({
  baseURL: getIntentsApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// The target environment is only known at runtime, from the widget config. So,
// resolve the base URL per request.
feeServiceApi.interceptors.request.use((requestConfig) => {
  requestConfig.baseURL = getIntentsApiBaseUrl();

  return requestConfig;
});
