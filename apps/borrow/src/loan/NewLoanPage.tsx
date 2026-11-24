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
  // The figures come from the hook, which keeps the dry run the borrow runs:
  // a retry that previews afresh and runs at once (never back in `confirm`)
  // replaces them.
  const { state, figures } = flow;

  const onBorrow = (request: BorrowRequest) => {
    const adapter = adapters.find(({ id }) => id === request.market.provider);

    if (!adapter) {
      return;
    }

    const { paid: _paid, ...input } = request;

    setLoan(dialogLoan(request, address));
    void flow.start({ ...input, adapter });
  };

  return (
    <>
      <NewLoanForm
        borrowing={state.kind === 'previewing'}
        onBorrow={onBorrow}
      />
      <BorrowDialog
        figures={figures}
        loan={loan}
        step={borrowDialogStep(state)}
        onCancel={() => {
          void flow.leave();
        }}
        onConfirm={() => {
          void flow.confirm();
        }}
        onViewPosition={() => {
          void flow.leave();
          void navigate({ to: '/positions' });
        }}
      />
    </>
  );
}
