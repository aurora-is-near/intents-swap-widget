import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
  // baseURL: 'https://intents-api.aurora.dev/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
