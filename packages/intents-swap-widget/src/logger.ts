import { isDebug } from '@/utils/checkers/isDebug';

/* eslint-disable no-console */
export const logger = {
  info: console.info,
  warn: console.warn,
  debug: isDebug() ? console.debug : () => {},
  error: console.error,
};
