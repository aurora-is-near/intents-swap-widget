import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';

import { INTENTS_CONNECT_API_KEY, INTENTS_CONNECT_API_URL } from '../config';

/** The Intents Connect client every app deposit and Activity use. */
export const intentsConnectApi = createIntentsConnectApi({
  baseUrl: INTENTS_CONNECT_API_URL,
  apiKey: INTENTS_CONNECT_API_KEY,
});
