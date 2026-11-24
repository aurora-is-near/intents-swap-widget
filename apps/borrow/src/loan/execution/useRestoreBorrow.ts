import {
  type Execution,
  type ExecutionStatus,
  IN_FLIGHT_STATUSES,
} from '@aurora-is-near/intents-connect';
import { useWalletExecutions } from '@aurora-is-near/intents-connect/react';
import { useCallback, useEffect, useRef } from 'react';

import { formatAddress } from '../../wallet/formatAddress';
import { formatUsd } from '../loanFormat';
import type { RestoredBorrowSummary } from './BorrowDialog';
import {
  clearPendingBorrow,
  type PendingBorrowRecord,
  readPendingBorrow,
} from './pendingBorrowStore';
import { isBorrowExecution } from './recipe';
import {
  type FoundExecution,
  lockStageOf,
  type RestorableExecution,
} from './useBorrowFlow';

/** Where an in-flight execution is, in the dialog's words. */
const STATUS_LABEL: Partial<Record<ExecutionStatus, string>> = {
  CREATED: 'Waiting for your signature',
  DEPOSIT_PENDING: 'Waiting for the deposit',
  DEPOSIT_PROCESSING: 'Bridging the collateral',
  OPERATION_PENDING: 'Opening the loan',
  OPERATION_PROCESSING: 'Opening the loan',
};

const usdRow = (label: string, usd: string | undefined) => {
  const value = usd === undefined ? NaN : Number(usd);

  return Number.isFinite(value)
    ? [[label, `≈ ${formatUsd(value)}`] as [string, string]]
    : [];
};

/**
 * Rows for a restored borrow when nothing was kept for it (another browser,
 * cleared storage): only what the execution itself says. Its token amounts
 * can't be named without their tokens, so the quote's dollar values stand in.
 */
export const genericBorrowRows = (
  execution: Pick<Execution, 'id' | 'status'> &
    Partial<Pick<Execution, 'quote'>>,
): [string, string][] => [
  ...usdRow('You pay', execution.quote?.amountInUsd),
  ...usdRow('Supply', execution.quote?.amountOutUsd),
  ['Status', STATUS_LABEL[execution.status] ?? execution.status],
  ['Execution', formatAddress(execution.id)],
];

/**
 * Rows for another app's in-flight execution: nothing about it is a loan,
 * so only where it is and its id.
 */
const otherAppRows = (
  execution: Pick<Execution, 'id' | 'status'>,
): [string, string][] => [
  ['Status', STATUS_LABEL[execution.status] ?? execution.status],
  ['Execution', formatAddress(execution.id)],
];

/**
 * What the dialog shows for an in-flight execution of the wallet: the kept
 * record's rows when it is this execution's, else generic ones (a loan's for
 * one of this app's borrows, only the status and id for another app's).
 */
export const foundSummary = (
  execution: RestorableExecution,
  kept: PendingBorrowRecord | undefined,
): RestoredBorrowSummary => {
  if (!isBorrowExecution(execution)) {
    return { executionId: execution.id, rows: otherAppRows(execution) };
  }

  return {
    executionId: execution.id,
    rows: kept?.rows ?? genericBorrowRows(execution),
    ...(kept?.borrowSymbol ? { borrowSymbol: kept.borrowSymbol } : {}),
  };
};

/**
 * A found in-flight execution can't be resumed unasked: it is another
 * app's, or one of this app's borrows still waits for the user (a
 * signature, or a deposit not known to be sent), and resuming it could
 * open the wallet. It is offered (`useBorrowFlow().offerResume`) instead.
 */
export const awaitsUser = (
  execution: RestorableExecution,
  kept: Pick<PendingBorrowRecord, 'depositSent'> | undefined,
) =>
  !isBorrowExecution(execution) ||
  lockStageOf(execution, kept?.depositSent) !== 'running';

export type UseRestoreBorrowOptions = {
  /** The connected wallet; nothing is looked up without one. */
  address: string | undefined;
  /** No borrow is under way here, so a found one can be shown. */
  idle: boolean;
  /**
   * Called once per wallet with its in-flight borrow and the rows to show:
   * the kept record's when it is this execution's, else generic ones. `kept`
   * is that record (its deposit origin and whether the deposit was sent).
   */
  onRestore: (
    execution: Execution,
    summary: RestoredBorrowSummary,
    kept: PendingBorrowRecord | undefined,
  ) => void;
};

/**
 * After a reload, looks once per connected wallet for an in-flight borrow
 * (an `IN_FLIGHT_STATUSES` execution with `intent === AAVE_BORROW_INTENT`),
 * as the Aave extension's `InFlightCheck` does, and hands it to `onRestore`.
 * Without one, another app's in-flight execution, which holds the same
 * lock, is handed over too (it is offered, never resumed). A kept record no
 * in-flight borrow matches is stale and dropped.
 *
 * Only a list fetched after this mount is trusted: the SDK keeps the last
 * list per wallet at provider level, so on a remount (switching tabs) the
 * first snapshot is the old one, which may still hold a finished borrow or
 * miss a running one. `refresh()` shares the load the hook starts and
 * resolves to the fresh list.
 *
 * Returns `findExecution`, which looks an in-flight execution of the wallet
 * up by id on a fresh list (for `useBorrowFlow`'s `inFlight` error), with
 * what its kept record says about the deposit.
 */
export const useRestoreBorrow = ({
  address,
  idle,
  onRestore,
}: UseRestoreBorrowOptions) => {
  const found = useWalletExecutions({
    status: IN_FLIGHT_STATUSES,
    refreshIntervalMs: 0,
  });

  const checkedRef = useRef<string | undefined>(undefined);
  const addressRef = useRef(address);
  const idleRef = useRef(idle);
  const onRestoreRef = useRef(onRestore);
  const refreshRef = useRef(found.refresh);

  addressRef.current = address;
  idleRef.current = idle;
  onRestoreRef.current = onRestore;
  refreshRef.current = found.refresh;

  // `idle` while the SDK has no wallet to list for yet.
  const listable = found.status !== 'idle';

  useEffect(() => {
    if (address === undefined || !listable || checkedRef.current === address) {
      return;
    }

    checkedRef.current = address;

    void refreshRef.current().then((fresh) => {
      // Unread (an error), or the wallet changed meanwhile.
      if (!Array.isArray(fresh) || addressRef.current !== address) {
        return;
      }

      // A borrow started here meanwhile owns the dialog, and its record.
      if (!idleRef.current) {
        return;
      }

      const executions = fresh as Execution[];
      const borrow = executions.find(isBorrowExecution);
      const execution = borrow ?? executions[0];

      const record = readPendingBorrow(address);

      if (!borrow) {
        clearPendingBorrow(address);
      }

      if (!execution) {
        return;
      }

      const kept =
        borrow && record?.executionId === execution.id ? record : undefined;

      if (borrow && record && !kept) {
        clearPendingBorrow(address, record.executionId);
      }

      onRestoreRef.current(execution, foundSummary(execution, kept), kept);
    });
  }, [address, listable]);

  const findExecution = useCallback(
    async (executionId: string): Promise<FoundExecution | undefined> => {
      const fresh = await refreshRef.current();
      const owner = addressRef.current;

      if (!Array.isArray(fresh)) {
        return undefined;
      }

      const execution = (fresh as Execution[]).find(
        ({ id }) => id === executionId,
      );

      if (!execution) {
        return undefined;
      }

      const record = owner === undefined ? undefined : readPendingBorrow(owner);
      const kept = record?.executionId === executionId ? record : undefined;

      return {
        execution,
        ...(kept
          ? { saved: { origin: kept.origin, depositSent: kept.depositSent } }
          : {}),
      };
    },
    [],
  );

  return { findExecution };
};
