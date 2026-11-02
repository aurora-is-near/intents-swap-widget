import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';

import { API_KEY, API_URL } from './config';

export const api = createIntentsConnectApi({
  baseUrl: API_URL,
  apiKey: API_KEY,
});
