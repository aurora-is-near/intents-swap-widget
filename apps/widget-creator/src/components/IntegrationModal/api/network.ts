import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'https://intents-api.aurora.dev/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
