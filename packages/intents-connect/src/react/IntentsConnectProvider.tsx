import { type ReactNode, useMemo, useRef } from 'react';

import {
  IntentsConnectContext,
  type IntentsConnectContextValue,
} from '@/react/context';
import { deriveWalletKey } from '@/react/useExecution';

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
  // Every ExecutionRunnerOptions field must appear in all three lists below
  // (destructure, memo object, deps) — a field missing from any of them is
  // silently dropped from the context and the runner falls back to its
  // default with no type error. `wallet` is the one exception: it appears as
  // a live getter, with `walletKey` standing in for it in the deps.
  const {
    api,
    wallet,
    plugins,
    pluginOptions,
    makeTransfer,
    autoCancelOnSignatureRejection,
    logger,
    pollIntervalMs,
    maxPollAttempts,
  } = value;

  // Most React connectors return a fresh wallet object every render, so keying
  // the memo on its identity would change the context value every render and
  // re-render every consumer for nothing. Same trick as useExecution's
  // walletRef: consumers read the LIVE connector through the getter below,
  // while the memo keys on what actually distinguishes one wallet from
  // another — its derived key.
  const walletRef = useRef(wallet);

  walletRef.current = wallet;

  const walletKey = wallet ? deriveWalletKey(wallet) : null;

  const memoised = useMemo<IntentsConnectContextValue>(
    () => ({
      api,
      plugins,
      pluginOptions,
      makeTransfer,
      autoCancelOnSignatureRejection,
      logger,
      pollIntervalMs,
      maxPollAttempts,
      get wallet() {
        return walletRef.current;
      },
    }),
    // walletKey stands in for `wallet`, which is read live through walletRef
    // (see above).
    [
      api,
      walletKey,
      plugins,
      pluginOptions,
      makeTransfer,
      autoCancelOnSignatureRejection,
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
