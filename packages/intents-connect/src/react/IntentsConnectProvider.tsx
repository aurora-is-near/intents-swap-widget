import { type ReactNode, useMemo } from 'react';

import {
  IntentsConnectContext,
  type IntentsConnectContextValue,
} from '@/react/context';

export type IntentsConnectProviderProps = IntentsConnectContextValue & {
  children: ReactNode;
};

/**
 * Supplies the API client and connected wallet to `useExecution`.
 *
 * Deliberately holds no execution state of its own: a runner is created per
 * `useExecution` call so two concurrent executions never share a machine.
 */
export const IntentsConnectProvider = ({
  children,
  ...value
}: IntentsConnectProviderProps) => {
  const {
    api,
    wallet,
    plugins,
    pluginOptions,
    makeTransfer,
    logger,
    pollIntervalMs,
    maxPollAttempts,
  } = value;

  const memoised = useMemo<IntentsConnectContextValue>(
    () => ({
      api,
      wallet,
      plugins,
      pluginOptions,
      makeTransfer,
      logger,
      pollIntervalMs,
      maxPollAttempts,
    }),
    [
      api,
      wallet,
      plugins,
      pluginOptions,
      makeTransfer,
      logger,
      pollIntervalMs,
      maxPollAttempts,
    ],
  );

  return (
    <IntentsConnectContext.Provider value={memoised}>
      {children}
    </IntentsConnectContext.Provider>
  );
};
