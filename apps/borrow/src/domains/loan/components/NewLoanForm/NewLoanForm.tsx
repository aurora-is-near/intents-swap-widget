import { Card } from '@aurora-is-near/ui-kit';

import { useConnectWallet } from '@/domains/wallet/hooks/useConnectWallet';
import { useWallet } from '@/domains/wallet/hooks/useWallet';

import { useLoanForm } from '../../hooks/useLoanForm';
import { MarketList } from '../MarketList/MarketList';
import { BorrowSection } from './BorrowSection';
import { LoanCta } from './LoanCta';
import { LoanSummary } from './LoanSummary';
import { LtvField } from './LtvField';
import { RecipientField } from './RecipientField';
import { SupplySection } from './SupplySection';
import type { BorrowRequest } from '../../hooks/useLoanForm';

/**
 * The New loan tab: the artboard's two columns (lines 213–375). The form
 * card holds the Supply and Borrow cards, the fee row, the loan-to-value
 * slider and the recipient option. Beside it, the markets for the form's
 * pair: those the LTV is above the max LTV of are off, and the selection is
 * the user's pick while it fits, else BEST (lines 1142–1143). Under them,
 * the summary tiles for the selected market and the call to action.
 *
 * Columns: the form card `flex:1 1 460px; max-width:560px`, the markets
 * `flex:1.3 1 520px`, gap 24, wrapping to one column on narrow screens.
 *
 * The ready call to action hands the loan to `onBorrow`, which opens the
 * borrow flow (`NewLoanPage`); `borrowing` shows it busy while the flow
 * prepares the dry run.
 */
export function NewLoanForm({
  onBorrow,
  borrowing = false,
}: {
  onBorrow?: (request: BorrowRequest) => void;
  borrowing?: boolean;
}) {
  const { isConnected, family } = useWallet();
  const connectWallet = useConnectWallet();
  const form = useLoanForm({ connected: isConnected, walletFamily: family });

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* The form card keeps its 22px padding at every width (inline on the
          artboard, so the 640px `.card` rule does not reach it). */}
      <Card
        aria-label="Loan details"
        className="min-w-0 flex-[1_1_460px] p-5.5 max-w-140"
        role="region">
        <SupplySection form={form} />
        <div aria-hidden="true" className="my-4.5 h-px bg-bd" />
        <BorrowSection form={form} />
        <LtvField
          liquidationLtvBps={form.liquidationLtvBps}
          ltv={form.ltv}
          onLtvChange={form.setLtv}
        />
        <RecipientField
          enabled={form.recipientEnabled}
          lockedReason={
            form.recipientRequired
              ? `Required: your wallet can't receive on ${form.figuresMarket?.chainLabel ?? 'EVM chains'}`
              : undefined
          }
          value={form.recipient}
          onEnabledChange={form.setRecipientEnabled}
          onValueChange={form.setRecipient}
        />
      </Card>

      <section aria-label="Markets" className="min-w-0 flex-[1.3_1_520px]">
        {/* The live markets as `.mkc` cards (lines 344–363), one per
            provider, for the form's pair and loan size. */}
        <MarketList
          disabledIds={form.disabledMarketIds}
          loanUsd={form.loanUsd}
          pair={form.pair}
          selectedId={form.market?.provider}
          onSelect={form.pickMarket}
        />
        {/* At an LTV no market fits, the figures stand in with the first
            market, as the artboard's `|| M[0]` (line 1143). */}
        <LoanSummary
          healthHundredths={form.figures?.healthHundredths}
          liquidationLtvBps={form.liquidationLtvBps}
          liquidationPriceUsd={form.liquidationPriceUsd}
          ltv={form.ltv}
          maxLtvBps={form.maxLtvBps}
        />
        <LoanCta
          // Before any market loads: Borrow launches on Aave only (line 372).
          marketName={form.figuresMarket?.name ?? 'Aave'}
          busy={borrowing}
          state={form.cta}
          onBorrow={() => {
            if (form.borrowRequest) {
              onBorrow?.(form.borrowRequest);
            }
          }}
          onConnect={connectWallet}
        />
      </section>
    </div>
  );
}
