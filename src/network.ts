import axios from 'axios';
import { OpenAPI } from '@defuse-protocol/one-click-sdk-typescript';
import type { AxiosRequestConfig } from 'axios';

OpenAPI.BASE = 'https://1click.chaindefuser.com';

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
