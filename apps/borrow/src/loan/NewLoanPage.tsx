import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { useMarketAdapters } from '../markets/MarketAdaptersProvider';
import { chainOf } from './chains';
import {
  BorrowDialog,
  type BorrowDialogLoan,
  borrowDialogStep,
  confirmRows,
  type RestoredBorrowSummary,
} from './execution/BorrowDialog';
import {
  clearPendingBorrow,
  savePendingBorrow,
} from './execution/pendingBorrowStore';
import { useBorrowFlow } from './execution/useBorrowFlow';
import {
  earlierBorrowSummary,
  useRestoreBorrow,
} from './execution/useRestoreBorrow';
import { NewLoanForm } from './NewLoanForm';
import type { BorrowRequest } from './useLoanForm';

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
  const { address } = useIntentsConnectWallet();
  const [loan, setLoan] = useState<BorrowDialogLoan>();
  // A borrow picked up after a reload, shown without a loan or figures.
  const [restored, setRestored] = useState<RestoredBorrowSummary>();
  // The wallet a borrow was created by, whose record it is.
  const ownerRef = useRef<string | undefined>(undefined);

  // "Close and keep tracking" was pressed on the delayed warning: the
  // borrow stays pending underneath, but its dialog is gone.
  const [dismissed, setDismissed] = useState(false);

  const flow = useBorrowFlow({
    onCreated: (executionId) => {
      ownerRef.current = address;

      // The figures of the dry run that created it, as the hook keeps them.
      const created = flow.figures;

      if (address && loan && created) {
        savePendingBorrow(address, {
          executionId,
          rows: confirmRows(loan, created),
          borrowSymbol: loan.borrow.symbol,
        });
      }
    },
    // Borrow found the previous borrow still on its way: it is shown, named
    // as the previous one, instead of the loan just requested.
    onPrevious: (execution) => {
      ownerRef.current = address;
      setLoan(undefined);
      setRestored(earlierBorrowSummary(execution, address));
      setDismissed(false);
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
  const delayed = state.kind === 'error' && state.error === 'delayed';

  if (dismissed && state.kind !== 'pending' && !delayed) {
    setDismissed(false);
  }

  // A signed borrow is being tracked, whether or not its dialog is shown:
  // a new one must not replace its loan and figures.
  const tracked =
    state.kind === 'signing' ||
    state.kind === 'cancelling' ||
    state.kind === 'pending' ||
    delayed;

  useRestoreBorrow({
    address,
    idle: state.kind === 'idle',
    onRestore: (execution, summary) => {
      ownerRef.current = address;
      setLoan(undefined);
      setRestored(summary);
      setDismissed(false);
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
          dismissed && (state.kind === 'pending' || delayed)
            ? undefined
            : borrowDialogStep(
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
