import {
  type Execution,
  type ExecutionStatus,
  IN_FLIGHT_STATUSES,
} from '@aurora-is-near/intents-connect';
import { useWalletExecutions } from '@aurora-is-near/intents-connect/react';
import { useEffect, useRef } from 'react';

import { formatAddress } from '../../wallet/formatAddress';
import { formatUsd } from '../loanFormat';
import type { RestoredBorrowSummary } from './BorrowDialog';
import { clearPendingBorrow, readPendingBorrow } from './pendingBorrowStore';
import { AAVE_BORROW_INTENT } from './recipe';

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
  execution: Pick<Execution, 'id' | 'status' | 'quote'>,
): [string, string][] => [
  ...usdRow('You pay', execution.quote?.amountInUsd),
  ...usdRow('Supply', execution.quote?.amountOutUsd),
  ['Status', STATUS_LABEL[execution.status] ?? execution.status],
  ['Execution', formatAddress(execution.id)],
];

/** One of this app's borrows: another app's runs share the wallet's lock. */
export const isBorrowExecution = (execution: Execution) =>
  execution.metadata?.intent === AAVE_BORROW_INTENT;

export type UseRestoreBorrowOptions = {
  /** The connected wallet; nothing is looked up without one. */
  address: string | undefined;
  /** No borrow is under way here, so a found one can be shown. */
  idle: boolean;
  /**
   * Called once per wallet with its in-flight borrow and the rows to show:
   * the kept record's when it is this execution's, else generic ones.
   */
  onRestore: (execution: Execution, summary: RestoredBorrowSummary) => void;
};

/**
 * After a reload, looks once per connected wallet for an in-flight borrow
 * (an `IN_FLIGHT_STATUSES` execution with `intent === AAVE_BORROW_INTENT`),
 * as the Aave extension's `InFlightCheck` does, and hands it to `onRestore`.
 * A kept record no in-flight borrow matches is stale and dropped.
 *
 * Only a list fetched after this mount is trusted: the SDK keeps the last
 * list per wallet at provider level, so on a remount (switching tabs) the
 * first snapshot is the old one, which may still hold a finished borrow or
 * miss a running one. `refresh()` shares the load the hook starts and
 * resolves to the fresh list.
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

      const execution: Execution | undefined = fresh.find(isBorrowExecution);

      const record = readPendingBorrow(address);

      if (!execution) {
        clearPendingBorrow(address);

        return;
      }

      const kept = record?.executionId === execution.id ? record : undefined;

      if (record && !kept) {
        clearPendingBorrow(address, record.executionId);
      }

      onRestoreRef.current(execution, {
        executionId: execution.id,
        rows: kept?.rows ?? genericBorrowRows(execution),
        ...(kept?.borrowSymbol ? { borrowSymbol: kept.borrowSymbol } : {}),
      });
    });
  }, [address, listable]);
};
