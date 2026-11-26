import {
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  StepProgress,
} from '@aurora-is-near/ui-kit';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Step } from '@aurora-is-near/ui-kit';

import { formatApr, formatBps } from '@/domains/markets/utils/format';
import { formatAddress } from '@/utils/formatAddress';
import { formatAmount, toDisplayNumber } from '@/domains/loan/utils/loanFormat';

import {
  apiErrorMessage,
  borrowRecoveryAction,
} from '../../utils/classifyBorrowError';
import {
  ACTION_LABEL,
  CANCEL_LABEL,
  errorCopy,
  WARN_SECONDARY_LABEL,
} from './errorCopy';
import type {
  BorrowCancelReason,
  BorrowFlowState,
  BorrowPendingStep,
} from '../../hooks/useBorrowFlow';
import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from '../../utils/classifyBorrowError';
import type { BorrowPreviewFigures } from '../../utils/previewFigures';
import type { ErrorCopyContext } from './errorCopy';

/*
 * The borrow modal (Web-Borrow-Confirm.dc.html lines 965–1025; the borrow
 * entry of the modal config, lines 1448–1454). One kit `Dialog` through
 * confirm, pending and done; the mobile artboards (Mob-Borrow-*.dc.html)
 * have the same markup, and the kit's dialog turns into a bottom sheet at
 * 640px. The artboards' Morpho / wstETH / Ethereum figures are sample data:
 * the rows here are the dry run's.
 */

/**
 * What a pending borrow waits for, and so what the user is told to do:
 * - `sign`: the wallet prompt for the intent's signature;
 * - `deposit`: the wallet prompt for the deposit transaction;
 * - `awaitingDeposit`: nothing to do; a deposit that may have been sent
 *   before a reload is waited for;
 * - `bridging`: nothing to do; the deposit left the wallet;
 * - `opening`: nothing to do; the loan is opening on the market.
 */
type BorrowPendingNote =
  | 'sign'
  | 'deposit'
  | 'awaitingDeposit'
  | 'bridging'
  | 'opening';

/** Which of the borrow dialogs is shown. */
export type BorrowDialogStep =
  | { kind: 'confirm' }
  | { kind: 'pending'; step: BorrowPendingStep; note: BorrowPendingNote }
  | {
      /** The wallet prompt to cancel an open execution is up. */
      kind: 'cancelling';
      reason: BorrowCancelReason;
    }
  | { kind: 'done' }
  | {
      kind: 'error';
      error: BorrowErrorKind;
      /**
       * The step the borrow had reached, drawn as failed (or active, for a
       * warning); the kind's own step when not known.
       */
      step?: BorrowPendingStep;
      action: BorrowRecoveryAction;
      /** The collateral arrived and waits; the borrow step failed. */
      fundsWaiting: boolean;
      /** While `fundsWaiting`: the execution, so the collateral can be found. */
      executionId?: string;
      /**
       * An `unknown` error's reason from the Intents Connect API (such as
       * "No liquidity available"), shown instead of the generic text.
       */
      detail?: string;
    };

/** A pending step's note: step 0 is the deposit prompt, or waiting for it. */
const PENDING_NOTE_AT: Record<
  BorrowPendingStep,
  (waitingForDeposit: boolean) => BorrowPendingNote
> = {
  0: (waitingForDeposit) => (waitingForDeposit ? 'awaitingDeposit' : 'deposit'),
  1: () => 'bridging',
  2: () => 'opening',
};

/**
 * The dialog for a flow state. Signing is the artboard's first pending
 * step ("Sign and deposit"); `idle` and `previewing` show no dialog here.
 * An error offers the hook's `action` (`useBorrowFlow().action`), else the
 * kind's own (`borrowRecoveryAction`).
 */
export const borrowDialogStep = (
  state: BorrowFlowState,
  action?: BorrowRecoveryAction,
  fundsWaiting = false,
  fundsWaitingExecutionId?: string,
): BorrowDialogStep | undefined => {
  switch (state.kind) {
    case 'confirm':
      return { kind: 'confirm' };
    case 'signing':
      return { kind: 'pending', step: 0, note: 'sign' };
    case 'cancelling':
      return { kind: 'cancelling', reason: state.reason };
    case 'pending':
      return {
        kind: 'pending',
        step: state.step,
        note: PENDING_NOTE_AT[state.step](state.waitingForDeposit),
      };
    case 'done':
      return { kind: 'done' };

    case 'error': {
      const detail =
        state.error === 'unknown' ? apiErrorMessage(state.cause) : undefined;

      return {
        kind: 'error',
        error: state.error,
        step: state.step,
        fundsWaiting,
        ...(detail ? { detail } : {}),
        ...(fundsWaiting && fundsWaitingExecutionId
          ? { executionId: fundsWaitingExecutionId }
          : {}),
        action: action ?? borrowRecoveryAction(state.error),
      };
    }
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

/**
 * Line 1020's note, per pending stage: what the borrow waits for and what,
 * if anything, the user has to do.
 */
const pendingNote = (
  note: BorrowPendingNote,
  borrowSymbol: string | undefined,
): string => {
  switch (note) {
    case 'sign':
      return 'Sign the request in your wallet. Nothing is sent until you also confirm the deposit.';
    case 'deposit':
      return 'Request signed. Now confirm the deposit transaction in your wallet. Don’t close this window.';
    case 'awaitingDeposit':
      return 'Waiting for your deposit to arrive. If you already sent it, it’s picked up here; if you didn’t, the request expires on its own.';
    case 'bridging':
      return 'Your deposit left your wallet. The collateral is bridging, which usually takes about a minute. Nothing to do but wait.';
    default:
      return `Opening the loan and sending ${borrowSymbol ?? 'the funds'} to your wallet. Nothing to do but wait.`;
  }
};

/*
 * The wallet prompt to cancel an open execution (`useBorrowFlow`'s
 * `cancelling`). No artboard draws it: the warning banner of the error
 * dialogs (lines 984–995), with this copy.
 */
const CANCEL_COPY: Record<BorrowCancelReason, { title: string; text: string }> =
  {
    declined: {
      title: 'Cancel the unsigned request',
      text: 'You didn’t approve the request, but it was already created and blocks new borrows from this wallet until it’s cancelled. Confirm the cancellation in your wallet. Nothing was sent.',
    },
    previous: {
      title: 'Cancel your earlier request first',
      text: 'An earlier borrow request from this wallet was never completed and blocks this one. Confirm its cancellation in your wallet, then sign the new request. Nothing was sent for it.',
    },
  };

const CANCEL_NOTE = 'Confirm the cancellation in your wallet.';

const CLOSE = 'Close';

/*
 * A borrow the user did not just confirm (`Summary.earlier`), still on its
 * way. No artboard draws it: the warning banner of the error dialogs.
 */
const EARLIER_TITLE = 'Your previous borrow is still in progress';
const EARLIER_TEXT =
  'This is the borrow you started earlier, not a new one. You can start a new borrow once it finishes.';

/**
 * The three steps (`n: 3`, line 1453), worded in the order the borrow runs
 * them, which is `useBorrowFlow`'s pending steps: 0 signing and the deposit,
 * 1 the collateral bridging to the market's chain, 2 Aave's supply and
 * borrow and the delivery. The artboard's labels put "Supply collateral and
 * open the loan" before "Bridge and deliver", the other way round, so they
 * are reworded here (review finding F22, option a). The last names the
 * borrowed token, or the funds when it is not known (a borrow restored
 * without its record).
 */
const stepLabels = (borrowSymbol: string | undefined) => [
  'Sign and deposit',
  'Bridge the collateral',
  `Open the loan and deliver ${borrowSymbol ?? 'the funds'}`,
];

/** Every dialog but done, which draws no steps. */
type ProgressStep = Exclude<BorrowDialogStep, { kind: 'done' }>;

type StepStatus = Step['status'];

/** Before the step reached done, the reached one `atStatus`, the rest waiting. */
const statusAround = (
  index: number,
  at: number,
  atStatus: StepStatus,
): StepStatus => {
  if (index < at) {
    return 'done';
  }

  return index === at ? atStatus : 'waiting';
};

/**
 * An error's step fails where the borrow stopped (the kind's own step when
 * not known); a warning keeps it running (`ac`, line 1519).
 */
const errorStepStatus = (
  dialog: Extract<BorrowDialogStep, { kind: 'error' }>,
  index: number,
): StepStatus => {
  const copy = errorCopy[dialog.error];

  return statusAround(
    index,
    dialog.step ?? copy.step,
    copy.tone === 'warn' ? 'active' : 'failed',
  );
};

/**
 * Each step's status (line 1519): before the current one done, the current
 * one active, the rest waiting; all waiting while confirming.
 */
const stepStatus = (dialog: ProgressStep, index: number): StepStatus => {
  switch (dialog.kind) {
    case 'confirm':
      return 'waiting';
    case 'cancelling':
      // A declined signature failed the first step; an earlier request's
      // cancellation comes before this borrow's steps.
      return index === 0 && dialog.reason === 'declined' ? 'failed' : 'waiting';
    case 'error':
      return errorStepStatus(dialog, index);
    default:
      return statusAround(index, dialog.step, 'active');
  }
};

const steps = (
  borrowSymbol: string | undefined,
  dialog: ProgressStep,
): Step[] =>
  stepLabels(borrowSymbol).map((label, index) => ({
    label,
    status: stepStatus(dialog, index),
  }));

const amountOf = (amount: bigint, decimals: number) =>
  formatAmount(toDisplayNumber(amount, decimals));

/**
 * The rows (line 1452), from the dry run. The fee is the dry run's own, in
 * the collateral it is taken from, so the borrowed amount is received
 * whole. When the paid token is converted into the collateral, the rows
 * also say what is paid, the rate and the least collateral that arrives
 * (what is supplied).
 */
export const confirmRows = (
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
    <dl className="m-0 mt-4 rounded-18 bg-sf2 px-4 py-1">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 border-0 border-t border-solid border-bd py-2.75 text-15 leading-font">
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

/**
 * A borrow picked up after a reload (`useRestoreBorrow`): the rows its
 * dialog showed, kept by `pendingBorrowStore`, or generic ones built from
 * the execution when nothing was kept.
 */
export type RestoredBorrowSummary = {
  rows: [string, string][];
  borrowSymbol?: string;
};

/** What the dialog says, from the loan and its figures or a restored summary. */
type Summary = {
  rows: [string, string][] | undefined;
  borrowSymbol: string | undefined;
  errorContext: Omit<ErrorCopyContext, 'fundsWaiting'>;
  /** Done's line (line 974). */
  doneText: string;
  /**
   * A borrow the user did not just confirm: restored after a reload, or the
   * previous one, still on its way, shown when Borrow was clicked.
   */
  earlier: boolean;
};

/** A restored borrow's error copy names nothing it doesn't know. */
const RESTORED_ERROR_CONTEXT: Summary['errorContext'] = {
  chainName: 'the paying chain',
  collateralSymbol: 'The collateral',
  borrowSymbol: 'that token',
  marketName: 'the market',
};

const summaryOf = (
  loan: BorrowDialogLoan | undefined,
  figures: BorrowPreviewFigures | undefined,
  restored: RestoredBorrowSummary | undefined,
): Summary | undefined => {
  if (loan) {
    return {
      rows: figures ? confirmRows(loan, figures) : undefined,
      borrowSymbol: loan.borrow.symbol,
      errorContext: {
        chainName: loan.paid.chainName,
        collateralSymbol: loan.collateral.symbol,
        borrowSymbol: loan.borrow.symbol,
        marketName: loan.market.name,
      },
      doneText: `${figures ? amountOf(figures.borrowAmount, loan.borrow.decimals) : ''} ${loan.borrow.symbol} is on its way to ${loan.recipient ?? 'your wallet'}.`,
      earlier: false,
    };
  }

  if (restored) {
    const { borrowSymbol } = restored;

    return {
      rows: restored.rows,
      borrowSymbol,
      errorContext: {
        ...RESTORED_ERROR_CONTEXT,
        ...(borrowSymbol ? { borrowSymbol } : {}),
      },
      // The amount and the recipient are in the rows, if at all.
      doneText: `The borrowed ${borrowSymbol ?? 'funds'} ${borrowSymbol ? 'is' : 'are'} on the way.`,
      earlier: true,
    };
  }

  return undefined;
};

/**
 * Rows the step adds: the execution whose collateral waits, in full, so it
 * can be looked up.
 */
const extraRows = (step: BorrowDialogStep): [string, string][] => {
  if (step.kind === 'error' && step.executionId) {
    return [['Execution', step.executionId]];
  }

  return [];
};

/** Lines 984–995: the error or warning block, 16px above the rows. */
function ErrorBanner({
  error,
  fundsWaiting,
  errorContext,
  detail,
}: {
  error: BorrowErrorKind;
  fundsWaiting: boolean;
  errorContext: Summary['errorContext'];
  /** The API's own reason, shown instead of the kind's text. */
  detail?: string;
}) {
  const copy = errorCopy[error];
  const context = { ...errorContext, fundsWaiting };

  return (
    <Banner
      className="mt-4"
      title={copy.title(context)}
      tone={copy.tone === 'warn' ? 'warning' : 'danger'}>
      {detail ?? copy.text(context)}
    </Banner>
  );
}

/**
 * Lines 1016–1019: `.go` 20px above, then the secondary link 12px below it:
 * "Cancel", or "Go to my positions" on a warning (line 1513).
 */
function ErrorActions({
  error,
  fundsWaiting,
  action,
  onAction,
  onCancel,
  onViewPosition,
}: {
  error: BorrowErrorKind;
  fundsWaiting: boolean;
  action: BorrowRecoveryAction;
  onAction: (action: BorrowRecoveryAction) => void;
  onCancel: () => void;
  onViewPosition: () => void;
}) {
  const copy = errorCopy[error];
  const warn = copy.tone === 'warn';

  return (
    <>
      <Button className="mt-5" onClick={() => onAction(action)}>
        {action === borrowRecoveryAction(error) && !fundsWaiting
          ? copy.button
          : ACTION_LABEL[action]}
      </Button>
      <div className="mt-3 text-center">
        <Button variant="link" onClick={warn ? onViewPosition : onCancel}>
          {warn ? WARN_SECONDARY_LABEL : CANCEL_LABEL}
        </Button>
      </div>
    </>
  );
}

type BorrowDialogProps = {
  /** Which dialog to show; `undefined` closes it. */
  step: BorrowDialogStep | undefined;
  loan: BorrowDialogLoan | undefined;
  /** The confirmed dry run's figures; kept through pending and done. */
  figures: BorrowPreviewFigures | undefined;
  /**
   * A borrow restored after a reload, shown when there is no `loan`: its
   * kept (or generic) rows instead of the figures.
   */
  restored?: RestoredBorrowSummary;
  /** "Confirm in wallet". */
  onConfirm: () => void;
  /** Cancel, the close button, Escape or an outside press (confirm, done). */
  onCancel: () => void;
  /** "View position" on the done dialog; "Go to my positions" on a warning. */
  onViewPosition: () => void;
  /** The error dialog's button: the step's `action` (`retry`, …). */
  onAction: (action: BorrowRecoveryAction) => void;
};

/** What the dialog is opened with. */
type ShownInput = {
  step: BorrowDialogStep;
  loan: BorrowDialogLoan | undefined;
  figures: BorrowPreviewFigures | undefined;
  restored: RestoredBorrowSummary | undefined;
};

type Content = { step: BorrowDialogStep; summary: Summary };

/**
 * An error before the dry run finished (a pre-check) has no figures. A
 * restored borrow has its rows instead, and is never confirmed here.
 */
const canShow = (
  step: BorrowDialogStep,
  loan: BorrowDialogLoan | undefined,
  figures: BorrowPreviewFigures | undefined,
  restored: RestoredBorrowSummary | undefined,
) =>
  loan !== undefined
    ? figures !== undefined || step.kind === 'error'
    : restored !== undefined && step.kind !== 'confirm';

/**
 * The content of the open dialog (`next`), or, once closed, the last content
 * shown, so the popup keeps it while it animates out.
 */
function useShownContent(next: ShownInput | undefined): Content | undefined {
  const last = useRef<Content>(undefined);
  const summary = next
    ? summaryOf(next.loan, next.figures, next.restored)
    : undefined;

  if (next && summary) {
    // Kept for the next render only: written during render, as in useBorrowFlow.
    last.current = { step: next.step, summary };
  }

  return last.current;
}

/**
 * Waiting for a deposit sent before a reload, or following a borrow the
 * user did not just confirm (`earlierPending`): nothing is asked of the
 * user, so it closes.
 */
const waitOf = (content: Content | undefined) => {
  if (content?.step.kind !== 'pending') {
    return { earlierPending: false, closableWait: false };
  }

  const { earlier } = content.summary;

  return {
    earlierPending: earlier,
    closableWait: earlier || content.step.note === 'awaitingDeposit',
  };
};

type Closes = { closeButton: boolean; dismissible: boolean };

/**
 * How each dialog closes, besides a closable wait: confirm and an error
 * have a close button; pending and cancelling can't be dismissed.
 */
const CLOSES: Record<BorrowDialogStep['kind'], Closes> = {
  confirm: { closeButton: true, dismissible: true },
  pending: { closeButton: false, dismissible: false },
  cancelling: { closeButton: false, dismissible: false },
  done: { closeButton: false, dismissible: true },
  error: { closeButton: true, dismissible: true },
};

/** Before anything was shown. */
const NO_CONTENT_CLOSES: Closes = { closeButton: false, dismissible: true };

/** A warning's window closes but the borrow is still tracked. */
const isWarning = (step: BorrowDialogStep | undefined) =>
  step?.kind === 'error' && errorCopy[step.error].tone === 'warn';

/**
 * Lines 1013–1014: `.go` 20px above, then `.linkb` Cancel centred 12px
 * below.
 */
function ConfirmActions({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Button className="mt-5" onClick={onConfirm}>
        Confirm in wallet
      </Button>
      <div className="mt-3 text-center">
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

/**
 * Line 1020: 14px `mut2`, centred, 20px above; Close below it when the wait
 * is closable.
 */
function WaitNote({
  children,
  closable,
  onClose,
}: {
  children: ReactNode;
  closable: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <p
        className="m-0 mt-5 text-center text-14 leading-font text-mut2"
        role="status">
        {children}
      </p>
      {closable ? (
        <Button className="mt-5" onClick={onClose}>
          {CLOSE}
        </Button>
      ) : null}
    </>
  );
}

/** The buttons, or the note, under the steps. */
function Footer({
  step,
  borrowSymbol,
  closableWait,
  onConfirm,
  onCancel,
  onViewPosition,
  onAction,
}: {
  step: ProgressStep;
  borrowSymbol: string | undefined;
  closableWait: boolean;
} & Pick<
  BorrowDialogProps,
  'onConfirm' | 'onCancel' | 'onViewPosition' | 'onAction'
>) {
  switch (step.kind) {
    case 'confirm':
      return <ConfirmActions onCancel={onCancel} onConfirm={onConfirm} />;
    case 'error':
      return (
        <ErrorActions
          action={step.action}
          error={step.error}
          fundsWaiting={step.fundsWaiting}
          onAction={onAction}
          onCancel={onCancel}
          onViewPosition={onViewPosition}
        />
      );
    case 'pending':
      return (
        <WaitNote closable={closableWait} onClose={onCancel}>
          {pendingNote(step.note, borrowSymbol)}
        </WaitNote>
      );
    default:
      return (
        <WaitNote closable={closableWait} onClose={onCancel}>
          {CANCEL_NOTE}
        </WaitNote>
      );
  }
}

/**
 * The banner above the rows: the error or warning, why a cancellation is
 * asked for, or that the borrow is an earlier one.
 */
function StepBanner({
  step,
  errorContext,
  earlierPending,
}: {
  step: ProgressStep;
  errorContext: Summary['errorContext'];
  earlierPending: boolean;
}) {
  if (step.kind === 'error') {
    return (
      <ErrorBanner
        detail={step.detail}
        error={step.error}
        errorContext={errorContext}
        fundsWaiting={step.fundsWaiting}
      />
    );
  }

  if (step.kind === 'cancelling') {
    return (
      <Banner
        className="mt-4"
        title={CANCEL_COPY[step.reason].title}
        tone="warning">
        {CANCEL_COPY[step.reason].text}
      </Banner>
    );
  }

  if (earlierPending) {
    return (
      <Banner className="mt-4" title={EARLIER_TITLE} tone="warning">
        {EARLIER_TEXT}
      </Banner>
    );
  }

  return null;
}

/** Confirm, pending, cancelling and error: the rows and the steps. */
function ProgressContent({
  step,
  summary,
  earlierPending,
  footer,
}: {
  step: ProgressStep;
  summary: Summary;
  earlierPending: boolean;
  footer: ReactNode;
}) {
  return (
    <>
      <DialogTitle>{TITLE}</DialogTitle>
      <DialogDescription>{SUBTITLE}</DialogDescription>
      <StepBanner
        earlierPending={earlierPending}
        errorContext={summary.errorContext}
        step={step}
      />
      {summary.rows ? (
        <Rows rows={[...summary.rows, ...extraRows(step)]} />
      ) : null}
      {/* Line 1001: 16px above. */}
      <StepProgress
        aria-label="Loan progress"
        className="mt-4"
        steps={steps(summary.borrowSymbol, step)}
      />
      {footer}
    </>
  );
}

/** Done: the tick, "Loan opened" and "View position". */
function DoneContent({
  doneText,
  onViewPosition,
}: {
  doneText: string;
  onViewPosition: () => void;
}) {
  return (
    <>
      {/* Line 971: centred, padding 14px 0 6px. */}
      <div className="pt-3.5 pb-1.5 text-center">
        <DoneMark />
        {/* Line 973: 28px / 800, 18px above. */}
        <DialogTitle className="mt-4.5 text-28">{DONE_TITLE}</DialogTitle>
        {/* Line 974: 16px / 1.45 `mut`, 10px above. */}
        <DialogDescription className="mt-2.5 text-16 leading-1.45">
          {doneText}
        </DialogDescription>
      </div>
      {/* Line 976: `.go`, 22px above. */}
      <Button className="mt-5.5" onClick={onViewPosition}>
        {DONE_BUTTON}
      </Button>
    </>
  );
}

/**
 * The confirm, pending and done dialogs of a borrow:
 * - Confirm: the dry run's rows, the three steps waiting, "Confirm in
 *   wallet" and Cancel; it closes like any dialog.
 * - Pending: the rows and the steps as the runner moves them, and a note
 *   saying what the borrow waits for and what the user has to do. It
 *   cannot be closed (line 1625), except while it only waits for a deposit
 *   sent before a reload, or follows a borrow the user did not just confirm
 *   (restored, or the previous one), which a banner names: then nothing is
 *   asked of the user.
 * - Cancelling: why a wallet prompt to cancel an open request is up, the
 *   steps, and the note to confirm it. It cannot be closed either.
 * - Done: "Loan opened" and "View position". No close button (the artboard
 *   draws none), but Escape and an outside press close it (line 1625).
 */
export function BorrowDialog({
  step,
  loan,
  figures,
  restored,
  onConfirm,
  onCancel,
  onViewPosition,
  onAction,
}: BorrowDialogProps) {
  const open = step !== undefined && canShow(step, loan, figures, restored);

  const content = useShownContent(
    open ? { step, loan, figures, restored } : undefined,
  );

  const { earlierPending, closableWait } = waitOf(content);
  const closes = content ? CLOSES[content.step.kind] : NO_CONTENT_CLOSES;

  return (
    <Dialog
      closeButton={closes.closeButton || closableWait}
      dismissible={closableWait || closes.dismissible}
      open={open}
      onOpenChange={(next) => {
        if (next) {
          return;
        }

        if (isWarning(content?.step)) {
          onAction('close');
        } else {
          onCancel();
        }
      }}>
      {content ? (
        <DialogContent>
          {content.step.kind === 'done' ? (
            <DoneContent
              doneText={content.summary.doneText}
              onViewPosition={onViewPosition}
            />
          ) : (
            <ProgressContent
              earlierPending={earlierPending}
              footer={
                <Footer
                  borrowSymbol={content.summary.borrowSymbol}
                  closableWait={closableWait}
                  step={content.step}
                  onAction={onAction}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                  onViewPosition={onViewPosition}
                />
              }
              step={content.step}
              summary={content.summary}
            />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
