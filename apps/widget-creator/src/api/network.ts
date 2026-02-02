import axios from 'axios';

export const feeServiceClient = axios.create({
  baseURL: 'https://intents-api.aurora.dev/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
