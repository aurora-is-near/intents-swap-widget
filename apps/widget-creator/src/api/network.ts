import axios from 'axios';

import { APP_ENV } from '@/utils/environment';

const INTENTS_API_BASE_URL =
  APP_ENV === 'staging'
    ? 'https://staging-intents-api.aurora.dev'
    : 'https://intents-api.aurora.dev';

export const feeServiceClient = axios.create({
  baseURL: `${INTENTS_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});
