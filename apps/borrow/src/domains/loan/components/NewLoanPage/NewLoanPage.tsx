import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { useMarketAdapters } from '@/domains/markets/providers/MarketAdaptersProvider';
import { BorrowDialog } from '@/domains/borrow/components/BorrowDialog/BorrowDialog';
import { getBorrowDialogStep } from '@/domains/borrow/components/BorrowDialog/utils/getBorrowDialogStep';
import { getConfirmRows } from '@/domains/borrow/components/BorrowDialog/utils/getSummary';
import {
  clearPendingBorrow,
  savePendingBorrow,
} from '@/domains/borrow/stores/pendingBorrowStore';
import { useBorrowFlow } from '@/domains/borrow/hooks/useBorrowFlow';
import {
  earlierBorrowSummary,
  useRestoreBorrow,
} from '@/domains/borrow/hooks/useRestoreBorrow';
import { useWallet } from '@/domains/wallet/hooks/useWallet';
import type {
  BorrowDialogLoan,
  RestoredBorrowSummary,
} from '@/domains/borrow/components/BorrowDialog/utils/getSummary';
import type { BorrowFlowState } from '@/domains/borrow/hooks/useBorrowFlow';

import { chainOf } from '../../utils/chains';
import { NewLoanForm } from '../NewLoanForm/NewLoanForm';
import type { BorrowRequest } from '../../hooks/useLoanForm';

/** What the dialog says about a requested loan. */
const dialogLoan = (
  { paid, amount, collateral, borrow, market, recipient }: BorrowRequest,
  walletAddress: string | undefined,
): BorrowDialogLoan => ({
  paid: {
    symbol: paid.symbol,
    decimals: paid.decimals,
    chainName: chainOf(paid.chain).name,
    amount,
  },
  collateral: { symbol: collateral.symbol, decimals: collateral.decimals },
  borrow: { symbol: borrow.symbol, decimals: borrow.decimals },
  market: {
    name: market.name,
    chainLabel: market.chainLabel,
    borrowApr: borrow.variableBorrowApr,
    liquidationLtvBps: collateral.liquidationLtvBps,
  },
  recipient,
  walletAddress,
});

/** The `delayed` warning: the borrow is still tracked underneath. */
const isDelayed = (state: BorrowFlowState) =>
  state.kind === 'error' && state.error === 'delayed';

/**
 * The borrow stays pending underneath: what "Close and keep tracking" on the
 * delayed warning keeps the dialog closed for.
 */
const stillPending = (state: BorrowFlowState) =>
  state.kind === 'pending' || isDelayed(state);

/**
 * A signed borrow is being tracked, whether or not its dialog is shown:
 * a new one must not replace its loan and figures.
 */
const isTracked = (state: BorrowFlowState) =>
  state.kind === 'signing' ||
  state.kind === 'cancelling' ||
  stillPending(state);

/**
 * The New loan tab: the form, and the borrow it starts. The ready call to
 * action previews the loan (`useBorrowFlow().start`) and opens the confirm
 * dialog; confirming runs it, the pending dialog follows the runner, and
 * done's "View position" goes to My positions (`bsub: 'pos'`, line 1454).
 *
 * A created borrow's rows are kept per wallet (`pendingBorrowStore`) until
 * it is over, so after a reload `useRestoreBorrow` picks up a borrow on its
 * way and the pending dialog reopens with the rows it showed.
 */
export function NewLoanPage() {
  const adapters = useMarketAdapters();
  const navigate = useNavigate();
  const { address } = useWallet();
  const [loan, setLoan] = useState<BorrowDialogLoan>();
  // A borrow picked up after a reload, shown without a loan or figures.
  const [restored, setRestored] = useState<RestoredBorrowSummary>();
  // The wallet a borrow was created by, whose record it is.
  const ownerRef = useRef<string | undefined>(undefined);

  // "Close and keep tracking" was pressed on the delayed warning: the
  // borrow stays pending underneath, but its dialog is gone.
  const [dismissed, setDismissed] = useState(false);

  // Shows a borrow picked up on its way (after a reload, or found by
  // Borrow) instead of a requested loan.
  const showRestored = (summary: RestoredBorrowSummary) => {
    ownerRef.current = address;
    setLoan(undefined);
    setRestored(summary);
    setDismissed(false);
  };

  const flow = useBorrowFlow({
    onCreated: (executionId) => {
      ownerRef.current = address;

      // The figures of the dry run that created it, as the hook keeps them.
      const created = flow.figures;

      if (address && loan && created) {
        savePendingBorrow(address, {
          executionId,
          rows: getConfirmRows(loan, created),
          borrowSymbol: loan.borrow.symbol,
        });
      }
    },
    // Borrow found the previous borrow still on its way: it is shown, named
    // as the previous one, instead of the loan just requested.
    onPrevious: (execution) => {
      showRestored(earlierBorrowSummary(execution, address));
    },
    onSettled: (executionId) => {
      const owner = ownerRef.current ?? address;

      if (owner) {
        clearPendingBorrow(owner, executionId);
      }
    },
  });

  // The figures come from the hook, which keeps the dry run the borrow runs:
  // a retry that previews afresh and runs at once (never back in `confirm`)
  // replaces them.
  const { state, figures } = flow;
  const delayed = isDelayed(state);

  if (dismissed && !stillPending(state)) {
    setDismissed(false);
  }

  const tracked = isTracked(state);

  useRestoreBorrow({
    address,
    idle: state.kind === 'idle',
    onRestore: (execution, summary) => {
      showRestored(summary);
      flow.restore(execution);
    },
  });

  const onBorrow = (request: BorrowRequest) => {
    if (tracked) {
      return;
    }

    const adapter = adapters.find(({ id }) => id === request.market.provider);

    if (!adapter) {
      return;
    }

    const { paid: _paid, ...input } = request;

    setLoan(dialogLoan(request, address));
    setRestored(undefined);
    setDismissed(false);
    void flow.start({ ...input, adapter });
  };

  return (
    <>
      <NewLoanForm
        borrowing={state.kind === 'previewing' || tracked}
        onBorrow={onBorrow}
      />
      <BorrowDialog
        figures={figures}
        loan={loan}
        restored={restored}
        step={
          dismissed && stillPending(state)
            ? undefined
            : getBorrowDialogStep(
                state,
                flow.action,
                flow.fundsWaiting,
                flow.fundsWaitingExecutionId,
              )
        }
        onCancel={() => {
          void flow.leave();
        }}
        onConfirm={() => {
          void flow.confirm();
        }}
        onAction={(action) => {
          if (action === 'close' && delayed) {
            setDismissed(true);
          }

          void flow[action]();
        }}
        onViewPosition={() => {
          void flow.leave();
          void navigate({ to: '/positions' });
        }}
      />
    </>
  );
}
