import { useEffect, useRef } from 'react';
import {
  type Execution,
  type ExecutionStatus,
  IN_FLIGHT_STATUSES,
} from '@aurora-is-near/intents-connect';
import {
  useWalletBalances,
  useWalletExecutions,
} from '@aurora-is-near/intents-connect/react';

import type { DeliverableOption } from '../supply/options';
import type { SupplyRun } from './types';

/** Still waiting on the user's funds. */
const AWAITING_FUNDS: readonly ExecutionStatus[] = [
  'CREATED',
  'DEPOSIT_PENDING',
];

/**
 * What resuming would prompt, by the runner's own rule: a signature while a
 * signing payload is offered and nothing says it was signed (whatever the
 * status reads), then the deposit while funds are awaited.
 */
const needsOf = ({
  status,
  details,
}: Execution): 'signature' | 'deposit' | undefined => {
  if (details.messageSigned !== true && details.payload) {
    return 'signature';
  }

  return AWAITING_FUNDS.includes(status) ? 'deposit' : undefined;
};

/**
 * Looks once for an execution holding the wallet's lock (a supply still
 * running after a reload, say) and reports it as a run to show, or `null`.
 * Renders nothing.
 */
export const InFlightCheck = ({
  walletKey,
  options,
  onDone,
}: {
  walletKey: string;
  /** To describe it as the option it supplies into, when it is one. */
  options?: readonly DeliverableOption[];
  onDone: (run: SupplyRun | null) => void;
}) => {
  const found = useWalletExecutions({
    status: IN_FLIGHT_STATUSES,
    refreshIntervalMs: 0,
  });

  // The token list, to name what it moves.
  const balances = useWalletBalances({ refreshIntervalMs: 0 });
  const done = useRef(onDone);

  done.current = onDone;

  const [execution] = found.executions;
  const { tokens } = balances;

  useEffect(() => {
    if (found.status === 'error') {
      done.current(null);

      return;
    }

    if (found.status !== 'success') {
      return;
    }

    if (!execution) {
      done.current(null);

      return;
    }

    const { originAsset, destinationAsset } = execution.quote;
    const origin = tokens.find((token) => token.assetId === originAsset);
    const destination = tokens.find(
      (token) => token.assetId === destinationAsset,
    );

    // Wait for the token list. An execution can still be shown without its
    // origin (older ones don't echo it), but not without what it supplies.
    if (!destination) {
      if (tokens.length > 0 || balances.status === 'error') {
        done.current(null);
      }

      return;
    }

    done.current({
      origin,
      option: options?.find(
        (option) => option.destinationAsset === destinationAsset,
      ) ?? {
        id: destination.assetId,
        symbol: destination.symbol,
        chain: destination.blockchain,
        // A native token is listed with an empty contract address.
        tokenAddress: destination.contractAddress
          ? destination.contractAddress
          : undefined,
        decimals: destination.decimals,
        destinationAsset: destination.assetId,
      },
      walletKey,
      quoted: execution,
      resumed: {
        id: execution.id,
        status: execution.status,
        waiting: needsOf(execution) !== undefined,
        needs: needsOf(execution),
      },
    });
  }, [found.status, execution, tokens, balances.status, options, walletKey]);

  return null;
};
