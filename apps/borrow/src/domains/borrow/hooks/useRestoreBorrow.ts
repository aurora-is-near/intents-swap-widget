import { IN_FLIGHT_STATUSES } from '@aurora-is-near/intents-connect';
import { useWalletExecutions } from '@aurora-is-near/intents-connect/react';
import { useEffect, useRef } from 'react';
import type { Execution } from '@aurora-is-near/intents-connect';

import { formatAddress } from '@/utils/formatAddress';
import { formatUsd } from '@/domains/loan/utils/loanFormat';

import { isOngoingExecution, progressOf } from '../stores/executionProgress';
import {
  clearPendingBorrow,
  readPendingBorrow,
} from '../stores/pendingBorrowStore';
import { AAVE_BORROW_INTENT } from '../utils/recipe';
import type { RestoredBorrowSummary } from '../components/BorrowDialog/BorrowDialog';

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
 * No status row: read once, it would go stale while the steps move on.
 */
const genericBorrowRows = (
  execution: Pick<Execution, 'id' | 'quote'>,
): [string, string][] => [
  ...usdRow('You pay', execution.quote?.amountInUsd),
  ...usdRow('Supply', execution.quote?.amountOutUsd),
  ['Execution', formatAddress(execution.id)],
];

/**
 * What the dialog shows for a borrow it did not just start (restored, or
 * the previous one still on its way): the rows kept for it when the
 * wallet's record is this execution's, else generic ones. A record of
 * another execution is stale and dropped.
 */
export const earlierBorrowSummary = (
  execution: Execution,
  address: string | undefined,
): RestoredBorrowSummary => {
  const record = address === undefined ? undefined : readPendingBorrow(address);
  const kept = record?.executionId === execution.id ? record : undefined;

  if (address !== undefined && record && !kept) {
    clearPendingBorrow(address, record.executionId);
  }

  return {
    rows: kept?.rows ?? genericBorrowRows(execution),
    ...(kept?.borrowSymbol ? { borrowSymbol: kept.borrowSymbol } : {}),
  };
};

/** One of this app's borrows: another app's runs share the wallet's lock. */
const isBorrowExecution = (execution: Execution) =>
  execution.metadata?.intent === AAVE_BORROW_INTENT;

/**
 * A borrow to pick up for `wallet`: one of this app's, on its way
 * (`isOngoingExecution`). One never signed, or signed and never funded as
 * this session saw, is not shown: resuming it would prompt the wallet, so it
 * is left to expire, or cancelled when the next borrow is confirmed.
 */
const isRestorableBorrow = (execution: Execution, wallet: string) =>
  isBorrowExecution(execution) &&
  isOngoingExecution(execution, progressOf(wallet, execution.id));

export type UseRestoreBorrowOptions = {
  /** The connected wallet; nothing is looked up without one. */
  address: string | undefined;
  /** No borrow is under way here, so a found one can be shown. */
  idle: boolean;
  /**
   * Called once per wallet with its borrow on its way and the rows to show:
   * the kept record's when it is this execution's, else generic ones.
   */
  onRestore: (execution: Execution, summary: RestoredBorrowSummary) => void;
};

/**
 * After a reload, looks once per connected wallet for a borrow on its way
 * (an `IN_FLIGHT_STATUSES` execution of this app, `isRestorableBorrow`), as
 * the Aave extension's `InFlightCheck` does, and hands it to `onRestore`.
 * A kept record no such borrow matches is stale and dropped.
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

      const execution: Execution | undefined = fresh.find((candidate) =>
        isRestorableBorrow(candidate, address),
      );

      if (!execution) {
        clearPendingBorrow(address);

        return;
      }

      onRestoreRef.current(execution, earlierBorrowSummary(execution, address));
    });
  }, [address, listable]);
};
