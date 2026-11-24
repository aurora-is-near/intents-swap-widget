import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type Step,
  StepProgress,
} from '@aurora-is-near/ui-kit';
import { useState } from 'react';

import { formatApr, formatBps } from '../../markets/format';
import { formatAddress } from '../../wallet/formatAddress';
import { formatAmount, toDisplayNumber } from '../loanFormat';
import type { BorrowPreviewFigures } from './previewFigures';
import type { BorrowFlowState, BorrowPendingStep } from './useBorrowFlow';

/*
 * The borrow modal (Web-Borrow-Confirm.dc.html lines 965–1025; the borrow
 * entry of the modal config, lines 1448–1454). One kit `Dialog` through
 * confirm, pending and done; the mobile artboards (Mob-Borrow-*.dc.html)
 * have the same markup, and the kit's dialog turns into a bottom sheet at
 * 640px. The artboards' Morpho / wstETH / Ethereum figures are sample data:
 * the rows here are the dry run's.
 */

/** Which of the borrow dialogs is shown. */
export type BorrowDialogStep =
  | { kind: 'confirm' }
  | { kind: 'pending'; step: BorrowPendingStep }
  | { kind: 'done' };

/**
 * The dialog for a flow state. Signing is the artboard's first pending
 * step ("Sign one intent"); `idle`, `previewing` and the error states show
 * no dialog here.
 */
export const borrowDialogStep = (
  state: BorrowFlowState,
): BorrowDialogStep | undefined => {
  switch (state.kind) {
    case 'confirm':
      return { kind: 'confirm' };
    case 'signing':
      return { kind: 'pending', step: 0 };
    case 'pending':
      return { kind: 'pending', step: state.step };
    case 'done':
      return { kind: 'done' };
    default:
      return undefined;
  }
};

/** What the dialog says about the loan, besides the dry run's figures. */
export type BorrowDialogLoan = {
  /** The wallet token paid with, and how much of it. */
  paid: { symbol: string; decimals: number; chainName: string; amount: bigint };
  collateral: { symbol: string; decimals: number };
  borrow: { symbol: string; decimals: number };
  market: {
    name: string;
    chainLabel: string;
    /** The borrow asset's variable APR, as a fraction. */
    borrowApr: number;
    liquidationLtvBps: number;
  };
  /** Another wallet the borrowed funds go to; `undefined` for the user's own. */
  recipient: string | undefined;
  /** The connected wallet, named in the Recipient row. */
  walletAddress: string | undefined;
};

/** The borrow modal's copy (lines 1451–1454). */
const TITLE = 'Confirm loan';
const SUBTITLE = 'Review the terms, then sign once in your wallet.';
const DONE_TITLE = 'Loan opened';
const DONE_BUTTON = 'View position';

/** Line 1020. */
const PENDING_NOTE = 'Check your wallet to sign. Don’t close this window.';

/** The three steps (`n: 3`, line 1453); the last names the borrowed token. */
const stepLabels = (borrowSymbol: string) => [
  'Sign one intent',
  'Supply collateral and open the loan',
  `Bridge and deliver ${borrowSymbol}`,
];

/**
 * Each step's status (line 1519): before the current one done, the current
 * one active, the rest waiting; all waiting while confirming.
 */
const steps = (
  borrowSymbol: string,
  dialog: Exclude<BorrowDialogStep, { kind: 'done' }>,
): Step[] =>
  stepLabels(borrowSymbol).map((label, index) => {
    if (dialog.kind === 'confirm') {
      return { label, status: 'waiting' };
    }

    if (index < dialog.step) {
      return { label, status: 'done' };
    }

    return { label, status: index === dialog.step ? 'active' : 'waiting' };
  });

const amountOf = (amount: bigint, decimals: number) =>
  formatAmount(toDisplayNumber(amount, decimals));

/**
 * The rows (line 1452), from the dry run. The fee is the dry run's own, in
 * the collateral it is taken from, so the borrowed amount is received
 * whole. When the paid token is converted into the collateral, the rows
 * also say what is paid, the rate and the least collateral that arrives
 * (what is supplied).
 */
const confirmRows = (
  loan: BorrowDialogLoan,
  figures: BorrowPreviewFigures,
): [string, string][] => {
  const { paid, collateral, borrow, market } = loan;
  const converted = figures.rate !== undefined;
  const collateralOf = (amount: bigint) =>
    `${amountOf(amount, collateral.decimals)} ${collateral.symbol}`;

  const borrowed = `${amountOf(figures.borrowAmount, borrow.decimals)} ${borrow.symbol}`;

  return [
    ...(converted
      ? ([
          [
            'You pay',
            `${amountOf(paid.amount, paid.decimals)} ${paid.symbol} · ${paid.chainName}`,
          ],
        ] as [string, string][])
      : []),
    [
      'Supply',
      `${converted ? '≈ ' : ''}${collateralOf(figures.collateralExpected)} · ${market.chainLabel}`,
    ],
    ...(figures.rate === undefined
      ? []
      : ([
          ['Rate', `1 ${paid.symbol} ≈ ${collateralOf(figures.rate)}`],
          ['Minimum received', collateralOf(figures.minimumReceived)],
        ] as [string, string][])),
    ['Borrow', `${borrowed} · ${market.chainLabel}`],
    [
      'Borrow fee',
      figures.fee === undefined ? '—' : `−${collateralOf(figures.fee)}`,
    ],
    ['You receive', borrowed],
    ['Market', `${market.name} · ${formatApr(market.borrowApr)} APR`],
    [
      'LTV',
      // The LTV in whole percent (`fmt(…, 0)`, line 1452).
      `${figures.ltvBps === null ? '—' : `${Math.round(Number(figures.ltvBps) / 100)}%`} · liquidation ${formatBps(market.liquidationLtvBps)}`,
    ],
    [
      'Recipient',
      loan.recipient ??
        (loan.walletAddress
          ? `Your wallet ${formatAddress(loan.walletAddress)}`
          : 'Your wallet'),
    ],
  ];
};

/**
 * Line 996: `sf2`, radius 18, padding 4px 16px; each row (line 998) padding
 * 11px 0 with a 1px `bd` top rule, 15px, the label `mut`, the value 600
 * right-aligned and wrapping anywhere (a full recipient address).
 */
function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 mt-[16px] rounded-[18px] bg-sf2 px-[16px] py-[4px]">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-[16px] border-0 border-t border-solid border-bd py-[11px] text-[15px] leading-[normal]">
          <dt className="shrink-0 text-mut">{label}</dt>
          <dd className="m-0 min-w-0 text-right font-semibold [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Line 972: the 68px badge circle with the lime tick, as the step icons. */
function DoneMark() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto block"
      height="68"
      viewBox="0 0 68 68"
      width="68">
      <circle className="fill-badge" cx="34" cy="34" r="34" />
      <path
        className="stroke-accent"
        d="M20 35l10 10 18-19"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
    </svg>
  );
}

type BorrowDialogProps = {
  /** Which dialog to show; `undefined` closes it. */
  step: BorrowDialogStep | undefined;
  loan: BorrowDialogLoan | undefined;
  /** The confirmed dry run's figures; kept through pending and done. */
  figures: BorrowPreviewFigures | undefined;
  /** "Confirm in wallet". */
  onConfirm: () => void;
  /** Cancel, the close button, Escape or an outside press (confirm, done). */
  onCancel: () => void;
  /** "View position" on the done dialog. */
  onViewPosition: () => void;
};

const sameStep = (a: BorrowDialogStep, b: BorrowDialogStep) =>
  a.kind === b.kind &&
  (a.kind !== 'pending' || (b.kind === 'pending' && a.step === b.step));

type Shown = {
  step: BorrowDialogStep;
  loan: BorrowDialogLoan;
  figures: BorrowPreviewFigures;
};

/**
 * The confirm, pending and done dialogs of a borrow:
 * - Confirm: the dry run's rows, the three steps waiting, "Confirm in
 *   wallet" and Cancel; it closes like any dialog.
 * - Pending: the rows and the steps as the runner moves them, and the note
 *   to keep the window open. It cannot be closed (line 1625).
 * - Done: "Loan opened" and "View position". No close button (the artboard
 *   draws none), but Escape and an outside press close it (line 1625).
 */
export function BorrowDialog({
  step,
  loan,
  figures,
  onConfirm,
  onCancel,
  onViewPosition,
}: BorrowDialogProps) {
  const open =
    step !== undefined && loan !== undefined && figures !== undefined;

  // The last content shown, so the popup keeps it while it animates out.
  const [shown, setShown] = useState<Shown>();

  if (
    open &&
    (!shown ||
      !sameStep(shown.step, step) ||
      shown.loan !== loan ||
      shown.figures !== figures)
  ) {
    setShown({ step, loan, figures });
  }

  const content = open ? { step, loan, figures } : shown;
  const kind = content?.step.kind;

  return (
    <Dialog
      closeButton={kind === 'confirm'}
      dismissible={kind !== 'pending'}
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}>
      {content ? (
        <DialogContent>
          {content.step.kind === 'done' ? (
            <>
              {/* Line 971: centred, padding 14px 0 6px. */}
              <div className="pt-[14px] pb-[6px] text-center">
                <DoneMark />
                {/* Line 973: 28px / 800, 18px above. */}
                <DialogTitle className="mt-[18px] text-[28px]">
                  {DONE_TITLE}
                </DialogTitle>
                {/* Line 974: 16px / 1.45 `mut`, 10px above. */}
                <DialogDescription className="mt-[10px] text-[16px] leading-[1.45]">
                  {amountOf(
                    content.figures.borrowAmount,
                    content.loan.borrow.decimals,
                  )}{' '}
                  {content.loan.borrow.symbol} is on its way to{' '}
                  {content.loan.recipient ?? 'your wallet'}.
                </DialogDescription>
              </div>
              {/* Line 976: `.go`, 22px above. */}
              <Button className="mt-[22px]" onClick={onViewPosition}>
                {DONE_BUTTON}
              </Button>
            </>
          ) : (
            <>
              <DialogTitle>{TITLE}</DialogTitle>
              <DialogDescription>{SUBTITLE}</DialogDescription>
              <Rows rows={confirmRows(content.loan, content.figures)} />
              {/* Line 1001: 16px above. */}
              <StepProgress
                aria-label="Loan progress"
                className="mt-[16px]"
                steps={steps(content.loan.borrow.symbol, content.step)}
              />
              {content.step.kind === 'confirm' ? (
                <>
                  {/* Lines 1013–1014: `.go` 20px above, then `.linkb`
                      Cancel centred 12px below. */}
                  <Button className="mt-[20px]" onClick={onConfirm}>
                    Confirm in wallet
                  </Button>
                  <div className="mt-[12px] text-center">
                    <Button variant="link" onClick={onCancel}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                // Line 1020: 14px `mut2`, centred, 20px above.
                <p
                  className="m-0 mt-[20px] text-center text-[14px] leading-[normal] text-mut2"
                  role="status">
                  {PENDING_NOTE}
                </p>
              )}
            </>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
