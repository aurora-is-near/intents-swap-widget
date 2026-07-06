import axios from 'axios';

const INTENTS_API_BASE_URL =
  import.meta.env.VITE_INTENTS_API_URL ?? 'https://intents-api.aurora.dev';

export const feeServiceClient = axios.create({
  baseURL: `${INTENTS_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});
