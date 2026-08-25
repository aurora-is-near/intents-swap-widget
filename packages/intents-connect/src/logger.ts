export type Logger = {
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

const PREFIX = '[INTENTS-CONNECT]';

/* eslint-disable no-console */
export const defaultLogger: Logger = {
  debug: () => {},
  warn: (message, ...args) => console.warn(`${PREFIX} ${message}`, ...args),
  error: (message, ...args) => console.error(`${PREFIX} ${message}`, ...args),
};
/* eslint-enable no-console */

export const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
};
