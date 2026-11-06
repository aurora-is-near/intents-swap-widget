import { useEffect, useRef } from 'react';
import {
  type Execution,
  IN_FLIGHT_STATUSES,
} from '@aurora-is-near/intents-connect';
import {
  useWalletBalances,
  useWalletExecutions,
} from '@aurora-is-near/intents-connect/react';

import type { DeliverableOption } from '../supply/options';
import { hasIntent, runOf } from './runOf';
import type { SupplyRun } from './types';

type ResolveProps = {
  walletKey: string;
  /** To describe it as the option it supplies into, when it is one. */
  options?: readonly DeliverableOption[];
  onDone: (run: SupplyRun | null) => void;
};

/**
 * Reports a known execution of the active wallet as a run to show, once
 * the token list can name what it supplies (`null` if it never can).
 * Renders nothing.
 */
export const ResolveRun = ({
  execution,
  walletKey,
  options,
  onDone,
}: ResolveProps & { execution: Execution }) => {
  // The token list, to name what it moves.
  const balances = useWalletBalances({ refreshIntervalMs: 0 });
  const done = useRef(onDone);

  done.current = onDone;

  const { tokens } = balances;

  useEffect(() => {
    const run = runOf(execution, { tokens, options, walletKey });

    if (run) {
      done.current(run);
    } else if (tokens.length > 0 || balances.status === 'error') {
      done.current(null);
    }
  }, [execution, tokens, balances.status, options, walletKey]);

  return null;
};

/**
 * Looks once for an execution holding the wallet's lock (a supply still
 * running after a reload, say), among the dApp's own (`intent`), and
 * reports it as a run to show, or `null`. Renders nothing.
 */
export const InFlightCheck = ({
  intent,
  ...props
}: ResolveProps & {
  /** The recipe's intent: another app's run isn't shown as this dApp's. */
  intent?: string;
}) => {
  const found = useWalletExecutions({
    status: IN_FLIGHT_STATUSES,
    refreshIntervalMs: 0,
  });

  const done = useRef(props.onDone);

  done.current = props.onDone;

  const [execution] = found.executions.filter(hasIntent(intent));

  useEffect(() => {
    if (
      found.status === 'error' ||
      (found.status === 'success' && !execution)
    ) {
      done.current(null);
    }
  }, [found.status, execution]);

  return found.status === 'success' && execution ? (
    <ResolveRun execution={execution} {...props} />
  ) : null;
};
