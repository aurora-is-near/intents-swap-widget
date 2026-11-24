import { Button } from '@aurora-is-near/ui-kit';
import { useEffect, useState } from 'react';

import {
  BorrowDialog,
  type BorrowDialogLoan,
  type BorrowDialogStep,
} from './BorrowDialog';
import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from './classifyBorrowError';
import type { BorrowPreviewFigures } from './previewFigures';

/*
 * The borrow dialogs on the dev-only /gallery, to compare with the
 * artboards (Web-/Mob-Borrow-Confirm, -Pending and -Done.dc.html) at 1280
 * and 420px, in both themes (the gallery's theme switch). Sample figures: a
 * loan on Aave Base, WETH collateral, USDC borrowed.
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

/** 1 WETH from Arbitrum, supplied as itself. */
const SAME_ASSET: { loan: BorrowDialogLoan; figures: BorrowPreviewFigures } = {
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
    liquidationPrice: 180_729_000_000n,
    healthHundredths: 166n,
  },
};

/** 3,000 USDC from Arbitrum, converted to WETH, sent to another wallet. */
const CONVERTED: typeof SAME_ASSET = {
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

/** How long a gallery pending dialog holds its step before it is done. */
const PENDING_HOLD_MS = 8000;

type Entry = {
  label: string;
  sample: typeof SAME_ASSET;
  step: BorrowDialogStep;
};

type ErrorStep = Extract<BorrowDialogStep, { kind: 'error' }>;

/** What an error entry adds: the lock-holding execution, cancelling. */
type ErrorExtra = Pick<ErrorStep, 'executionId' | 'lock' | 'cancelling'>;

function errorEntry(
  label: string,
  error: BorrowErrorKind,
  action: BorrowRecoveryAction,
  step?: null,
  extra: ErrorExtra = {},
): Entry {
  return {
    label,
    sample: SAME_ASSET,
    step: {
      kind: 'error',
      error,
      action,
      fundsWaiting: false,
      ...(step === undefined ? {} : { step }),
      ...extra,
    },
  };
}

/** A sample execution holding the wallet's lock. */
const LOCK_EXECUTION_ID = '7f3c2a10-5b4e-4d8a-9e61-0c2b8f4d1a93';

/** An `inFlight` entry: whose the execution is, and where it is. */
const inFlightExtra = (
  owner: NonNullable<ErrorStep['lock']>['owner'],
  stage: NonNullable<ErrorStep['lock']>['stage'],
  cancelling = false,
): ErrorExtra => ({
  executionId: LOCK_EXECUTION_ID,
  lock: { owner, stage },
  cancelling,
});

/**
 * Every error kind's entry, typed by `BorrowErrorKind` so a new kind can't
 * be left out. The error artboards (`Web-/Mob-Borrow-Rejected`, `-NoGas`,
 * `-PriceMoved`, `-NoMarketLiquidity`, `-Delayed`.dc.html), each with its
 * own action; no route and the quote change have no artboard and reuse the
 * error dialog, raised before anything was signed (`step: null`).
 */
const ERRORS: Record<
  BorrowErrorKind,
  {
    label: string;
    action: BorrowRecoveryAction;
    step?: null;
    extra?: ErrorExtra;
  }
> = {
  rejected: { label: 'Error · rejected', action: 'retry' },
  noGas: { label: 'Error · no gas', action: 'retry' },
  // Another execution holds the wallet's lock: a borrow running here.
  inFlight: {
    label: 'In flight · running',
    action: 'resumeExisting',
    step: null,
    extra: inFlightExtra('borrow', 'running'),
  },
  transferFailed: {
    label: 'Error · transfer failed',
    action: 'retryTransfer',
    extra: { executionId: LOCK_EXECUTION_ID },
  },
  priceMoved: { label: 'Error · price moved', action: 'refresh' },
  noLiquidity: { label: 'Error · no liquidity', action: 'close' },
  delayed: { label: 'Error · delayed', action: 'close' },
  noRoute: { label: 'Error · no route', action: 'close', step: null },
  quoteChanged: {
    label: 'Error · quote changed',
    action: 'refresh',
    step: null,
  },
  unknown: { label: 'Error · unknown', action: 'close' },
};

const ENTRIES: Entry[] = [
  { label: 'Confirm', sample: SAME_ASSET, step: { kind: 'confirm' } },
  {
    label: 'Confirm · converted',
    sample: CONVERTED,
    step: { kind: 'confirm' },
  },
  {
    label: 'Pending · signing',
    sample: SAME_ASSET,
    step: { kind: 'pending', step: 0 },
  },
  // The artboard's pending state (`phase: 1`).
  {
    label: 'Pending · step 2',
    sample: SAME_ASSET,
    step: { kind: 'pending', step: 1 },
  },
  {
    label: 'Pending · step 3',
    sample: SAME_ASSET,
    step: { kind: 'pending', step: 2 },
  },
  { label: 'Done', sample: SAME_ASSET, step: { kind: 'done' } },
  // One entry per error kind (`ERRORS`), then the unknown error raised
  // before anything was signed: no step marked, nothing sent.
  ...Object.entries(ERRORS).map(([error, { label, action, step, extra }]) =>
    errorEntry(label, error as BorrowErrorKind, action, step, extra),
  ),
  errorEntry('Error · unknown before signing', 'unknown', 'close', null),
  // The other in-flight variants: never signed, waiting for its deposit,
  // another app's run, and the cancel signature being prompted.
  errorEntry(
    'In flight · never signed',
    'inFlight',
    'resumeExisting',
    null,
    inFlightExtra('borrow', 'unsigned'),
  ),
  errorEntry(
    'In flight · waiting for deposit',
    'inFlight',
    'resumeExisting',
    null,
    inFlightExtra('borrow', 'deposit'),
  ),
  errorEntry(
    'In flight · another app',
    'inFlight',
    'resumeExisting',
    null,
    inFlightExtra('other', 'running'),
  ),
  errorEntry(
    'In flight · cancelling',
    'inFlight',
    'resumeExisting',
    null,
    inFlightExtra('borrow', 'running', true),
  ),
];

/**
 * One button per dialog state. A pending dialog can't be closed, so it
 * turns into the done dialog after a few seconds, as a run would.
 */
export function BorrowDialogGallery() {
  const [open, setOpen] = useState<{
    sample: typeof SAME_ASSET;
    step: BorrowDialogStep;
  }>();

  const pending = open?.step.kind === 'pending';

  useEffect(() => {
    if (!pending) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setOpen((current) => current && { ...current, step: { kind: 'done' } });
    }, PENDING_HOLD_MS);

    return () => clearTimeout(timer);
  }, [pending]);

  const close = () => setOpen(undefined);

  return (
    <section
      aria-labelledby="borrow-dialogs"
      className="flex flex-col gap-4 bg-sf p-6 font-sans text-ink">
      <h2
        className="m-0 text-xs font-semibold tracking-[0.14em] text-mut2 uppercase"
        id="borrow-dialogs">
        Borrow dialogs
      </h2>
      <div className="flex flex-wrap gap-3">
        {ENTRIES.map(({ label, sample, step }) => (
          <Button
            key={label}
            size="md"
            variant="secondary"
            onClick={() => setOpen({ sample, step })}>
            {label}
          </Button>
        ))}
      </div>
      <BorrowDialog
        figures={open?.sample.figures}
        loan={open?.sample.loan}
        step={open?.step}
        onCancel={close}
        onConfirm={() =>
          setOpen(
            (current) =>
              current && { ...current, step: { kind: 'pending', step: 0 } },
          )
        }
        onViewPosition={close}
        onCancelExisting={close}
        onAction={(action) =>
          setOpen((current) => {
            if (!current || action === 'close') {
              return undefined;
            }

            // Refreshing or reconnecting goes back to confirm; retrying,
            // resuming or retrying the transfer goes on to signing.
            return {
              ...current,
              step:
                action === 'refresh' || action === 'reconnect'
                  ? { kind: 'confirm' }
                  : { kind: 'pending', step: 0 },
            };
          })
        }
      />
    </section>
  );
}
