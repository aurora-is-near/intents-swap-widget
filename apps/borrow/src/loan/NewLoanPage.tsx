import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useMarketAdapters } from '../markets/MarketAdaptersProvider';
import { chainOf } from './chains';
import {
  BorrowDialog,
  type BorrowDialogLoan,
  borrowDialogStep,
} from './execution/BorrowDialog';
import { useBorrowFlow } from './execution/useBorrowFlow';
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
 */
export function NewLoanPage() {
  const flow = useBorrowFlow();
  const adapters = useMarketAdapters();
  const navigate = useNavigate();
  const { address } = useIntentsConnectWallet();
  const [loan, setLoan] = useState<BorrowDialogLoan>();
  // "Close and keep tracking" was pressed on the delayed warning: the
  // borrow stays pending underneath, but its dialog is gone.
  const [dismissed, setDismissed] = useState(false);
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
    state.kind === 'signing' || state.kind === 'pending' || delayed;

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
        step={
          dismissed && (state.kind === 'pending' || delayed)
            ? undefined
            : borrowDialogStep(state, flow.action, flow.fundsWaiting)
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
