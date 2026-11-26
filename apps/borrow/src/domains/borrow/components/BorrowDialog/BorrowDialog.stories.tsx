import { Button } from '@aurora-is-near/ui-kit';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BorrowDialog } from './BorrowDialog';
import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from '../../utils/classifyBorrowError';
import type { BorrowPreviewFigures } from '../../utils/previewFigures';
import type {
  BorrowDialogLoan,
  BorrowDialogStep,
  RestoredBorrowSummary,
} from './BorrowDialog';

/*
 * The borrow dialogs, to compare with the artboards (Web-/Mob-Borrow-Confirm,
 * -Pending and -Done.dc.html) at 1280 and 420px, in both themes (the
 * toolbar's theme switch). Sample figures: a loan on Aave Base, WETH
 * collateral, USDC borrowed. One story per dialog state, and a walkthrough
 * that moves between them as a run would.
 */

const WETH = { symbol: 'WETH', decimals: 18 };
const USDC = { symbol: 'USDC', decimals: 6 };
const ETHER = 10n ** 18n;

const MARKET: BorrowDialogLoan['market'] = {
  name: 'Aave',
  chainLabel: 'Base',
  borrowApr: 0.0485,
  liquidationLtvBps: 8300,
};

const WALLET = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

type Sample = { loan: BorrowDialogLoan; figures: BorrowPreviewFigures };

/** 1 WETH from Arbitrum, supplied as itself. */
const SAME_ASSET: Sample = {
  loan: {
    paid: { ...WETH, chainName: 'Arbitrum', amount: ETHER },
    collateral: WETH,
    borrow: USDC,
    market: MARKET,
    recipient: undefined,
    walletAddress: WALLET,
  },
  figures: {
    collateralExpected: 996n * 10n ** 15n,
    minimumReceived: 986n * 10n ** 15n,
    rate: undefined,
    borrowAmount: 1_479_000_000n,
    fee: 3n * 10n ** 15n,
    ltvBps: 5000n,
  },
};

/** 3,000 USDC from Arbitrum, converted to WETH, sent to another wallet. */
const CONVERTED: Sample = {
  loan: {
    ...SAME_ASSET.loan,
    paid: { ...USDC, chainName: 'Arbitrum', amount: 3_000_000_000n },
    recipient: '0x1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e',
  },
  figures: {
    ...SAME_ASSET.figures,
    collateralExpected: 995n * 10n ** 15n,
    minimumReceived: 985n * 10n ** 15n,
    rate: 331_666_666_666_666n,
    borrowAmount: 1_477_500_000n,
  },
};

/** The previous borrow, as Borrow finds it with nothing kept for it. */
const PREVIOUS: RestoredBorrowSummary = {
  rows: [
    ['You pay', '≈ $5.06'],
    ['Supply', '≈ $5.05'],
    ['Execution', 'c49114…7841'],
  ],
};

const noop = () => {};

const meta = {
  title: 'BorrowDialog',
  component: BorrowDialog,
  // Each story opens a modal: one per page, not stacked on a docs page.
  tags: ['!autodocs'],
  parameters: {
    // Their amounts are bigints, which the object control can't serialize.
    controls: { exclude: ['loan', 'figures'] },
  },
  args: {
    ...SAME_ASSET,
    step: { kind: 'confirm' },
    onCancel: noop,
    onConfirm: noop,
    onViewPosition: noop,
    onAction: noop,
  },
} satisfies Meta<typeof BorrowDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

const withStep = (step: BorrowDialogStep, sample = SAME_ASSET): Story => ({
  args: { ...sample, step },
});

const errorStory = (
  error: BorrowErrorKind,
  action: BorrowRecoveryAction,
): Story => withStep({ kind: 'error', error, action, fundsWaiting: false });

export const Confirm = withStep({ kind: 'confirm' });
/** Paid in another token than the collateral: the rate and minimum received show. */
export const ConfirmConverted = withStep({ kind: 'confirm' }, CONVERTED);

export const PendingSigning = withStep({
  kind: 'pending',
  step: 0,
  note: 'sign',
});
export const PendingDeposit = withStep({
  kind: 'pending',
  step: 0,
  note: 'deposit',
});
/** Restored after a reload: the deposit is waited for, never prompted. */
export const PendingAwaitingDeposit = withStep({
  kind: 'pending',
  step: 0,
  note: 'awaitingDeposit',
});
/** The artboard's pending state (`phase: 1`). */
export const PendingBridging = withStep({
  kind: 'pending',
  step: 1,
  note: 'bridging',
});
export const PendingOpening = withStep({
  kind: 'pending',
  step: 2,
  note: 'opening',
});
/** The previous borrow, still on its way when Borrow is clicked. */
export const PendingPreviousBorrow: Story = {
  args: {
    loan: undefined,
    figures: undefined,
    restored: PREVIOUS,
    step: { kind: 'pending', step: 2, note: 'opening' },
  },
};

export const CancellingDeclined = withStep({
  kind: 'cancelling',
  reason: 'declined',
});
export const CancellingPrevious = withStep({
  kind: 'cancelling',
  reason: 'previous',
});

export const Done = withStep({ kind: 'done' });

// The error artboards (`Web-/Mob-Borrow-Rejected`, `-NoGas`, `-PriceMoved`,
// `-NoMarketLiquidity`, `-Delayed`.dc.html), each with its own action.
export const ErrorRejected = errorStory('rejected', 'retry');
export const ErrorDepositRejected = errorStory('depositRejected', 'retry');
export const ErrorCancelDeclined = errorStory('cancelDeclined', 'retry');
export const ErrorBusy = errorStory('busy', 'close');
export const ErrorWalletDisconnected = errorStory(
  'walletDisconnected',
  'reconnect',
);
export const ErrorNoGas = errorStory('noGas', 'retry');
export const ErrorQuoteMoved = errorStory('quoteMoved', 'refresh');
export const ErrorPriceMoved = errorStory('priceMoved', 'refresh');
export const ErrorNoLiquidity = errorStory('noLiquidity', 'close');
export const ErrorDelayed = errorStory('delayed', 'close');

/** How long a walkthrough's pending dialog holds before it is done. */
const PENDING_HOLD_MS = 8000;

const WALKTHROUGH: {
  label: string;
  sample: Sample;
  step: BorrowDialogStep;
  restored?: RestoredBorrowSummary;
}[] = [
  { label: 'Confirm', sample: SAME_ASSET, step: { kind: 'confirm' } },
  {
    label: 'Confirm · converted',
    sample: CONVERTED,
    step: { kind: 'confirm' },
  },
  {
    label: 'Pending · bridging',
    sample: SAME_ASSET,
    step: { kind: 'pending', step: 1, note: 'bridging' },
  },
  {
    label: 'Pending · previous borrow',
    sample: SAME_ASSET,
    step: { kind: 'pending', step: 2, note: 'opening' },
    restored: PREVIOUS,
  },
  {
    label: 'Error · rejected',
    sample: SAME_ASSET,
    step: {
      kind: 'error',
      error: 'rejected',
      action: 'retry',
      fundsWaiting: false,
    },
  },
];

/** The walkthrough's open dialog. */
type Open = {
  sample: Sample;
  step: BorrowDialogStep;
  restored?: RestoredBorrowSummary;
};

/** The dialogs that wait, and so turn into done on their own. */
const WAITING_KINDS: BorrowDialogStep['kind'][] = ['pending', 'cancelling'];

const isWaiting = (open: Open | undefined) =>
  open !== undefined && WAITING_KINDS.includes(open.step.kind);

/** The open dialog moved to `step`; nothing when it was closed. */
const withOpenStep = (current: Open | undefined, step: BorrowDialogStep) =>
  current && { ...current, step };

const SIGNING: BorrowDialogStep = { kind: 'pending', step: 0, note: 'sign' };

/** Retrying signs again; refreshing goes back to confirm. */
const stepAfter = (action: BorrowRecoveryAction): BorrowDialogStep =>
  action === 'retry' ? SIGNING : { kind: 'confirm' };

/** An error's action: closing closes, anything else moves the dialog on. */
const afterAction =
  (action: BorrowRecoveryAction) =>
  (current: Open | undefined): Open | undefined =>
    action === 'close' ? undefined : withOpenStep(current, stepAfter(action));

/** A restored borrow is shown from its summary, without a loan. */
const dialogInput = (open: Open | undefined) => {
  if (!open) {
    return { figures: undefined, loan: undefined, restored: undefined };
  }

  return open.restored
    ? { figures: undefined, loan: undefined, restored: open.restored }
    : { ...open.sample, restored: undefined };
};

/**
 * Open a dialog, then use its buttons: confirming signs, a pending dialog
 * turns into the done dialog after a few seconds, retrying signs again and
 * refreshing goes back to confirm.
 */
function Walkthrough() {
  const [open, setOpen] = useState<Open>();

  const pending = isWaiting(open);

  useEffect(() => {
    if (!pending) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setOpen((current) => withOpenStep(current, { kind: 'done' }));
    }, PENDING_HOLD_MS);

    return () => clearTimeout(timer);
  }, [pending]);

  const close = () => setOpen(undefined);
  const input = dialogInput(open);

  return (
    <div className="flex flex-wrap gap-3">
      {WALKTHROUGH.map(({ label, sample, step, restored }) => (
        <Button
          key={label}
          size="md"
          variant="secondary"
          onClick={() => setOpen({ sample, step, restored })}>
          {label}
        </Button>
      ))}
      <BorrowDialog
        figures={input.figures}
        loan={input.loan}
        restored={input.restored}
        step={open?.step}
        onCancel={close}
        onConfirm={() => setOpen((current) => withOpenStep(current, SIGNING))}
        onViewPosition={close}
        onAction={(action) => setOpen(afterAction(action))}
      />
    </div>
  );
}

export const Interactive: Story = { render: () => <Walkthrough /> };
