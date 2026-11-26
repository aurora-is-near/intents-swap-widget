import { Button } from '@aurora-is-near/ui-kit';

import { formatAmount, toDisplayNumber } from '../../utils/loanFormat';
import type { CtaState } from '../../model/ctaState';

/**
 * `.cta` (Web-Borrow.dc.html line 371): the kit's `.go` with radius 16, gap
 * 10 and margin-top 14.
 */
const CTA = 'mt-3.5 gap-2.5 rounded-16';

/**
 * The lime market chip (line 372): `accent`, `onlime` text, padding 1px
 * 10px, radius 7. A span, not the kit's `Chip`, which is a button and cannot
 * sit inside one.
 */
function MarketChip({ name }: { name: string }) {
  return (
    <span className="rounded-7 bg-accent px-2.5 py-px text-onlime">{name}</span>
  );
}

/** The label of every state without the chip; errors in the danger look. */
const PLAIN: Record<
  Exclude<CtaState['kind'], 'connect' | 'ready'>,
  { label: string; danger: boolean }
> = {
  enterAmount: { label: 'Enter an amount', danger: false },
  insufficientBalance: { label: 'Insufficient balance', danger: true },
  ltvTooHigh: { label: 'LTV too high', danger: true },
  enterRecipient: { label: 'Enter recipient address', danger: false },
};

type LoanCtaProps = {
  state: CtaState;
  /** The market the chip names while connecting: the selection, if any. */
  marketName: string;
  onConnect: () => void;
  /** The ready state's action: starts the borrow flow. */
  onBorrow: () => void;
  /** The borrow flow is preparing its dry run: the ready button is busy. */
  busy?: boolean;
};

/**
 * The call to action (lines 371–373, script line 1578), one state at a
 * time. Connecting opens the wallet; the ready state, "Borrow 1,234 USDC on
 * Aave", starts the borrow flow (`onBorrow`), which opens the confirm
 * dialog. This reverses the earlier ruling that kept it disabled until
 * Borrow execution, which named this feature as the point to enable it.
 * Every other state is disabled. An insufficient balance or an LTV above
 * every market's max takes `.go.bad` (line 56), as the artboard's other
 * forms do for an error.
 */
export function LoanCta({
  state,
  marketName,
  onConnect,
  onBorrow,
  busy = false,
}: LoanCtaProps) {
  switch (state.kind) {
    case 'connect':
      return (
        <Button className={CTA} onClick={onConnect}>
          <span>Connect wallet to borrow on</span>
          <MarketChip name={marketName} />
        </Button>
      );
    case 'ready':
      return (
        <Button className={CTA} loading={busy} onClick={onBorrow}>
          <span>
            Borrow{' '}
            {formatAmount(toDisplayNumber(state.borrowAmount, state.decimals))}{' '}
            {state.symbol} on
          </span>
          <MarketChip name={state.marketName} />
        </Button>
      );
    default: {
      const { label, danger } = PLAIN[state.kind];

      return (
        <Button
          className={CTA}
          disabled
          variant={danger ? 'danger' : 'primary'}>
          {label}
        </Button>
      );
    }
  }
}
