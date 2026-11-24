import { Button } from '@aurora-is-near/ui-kit';
import { useEffect, useState } from 'react';

import {
  BorrowDialog,
  type BorrowDialogLoan,
  type BorrowDialogStep,
} from './BorrowDialog';
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
      />
    </section>
  );
}
