import {
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type Step,
  StepProgress,
} from '@aurora-is-near/ui-kit';
import { type ReactNode, useState } from 'react';

import { formatApr, formatBps } from '../../markets/format';
import { formatAddress } from '../../wallet/formatAddress';
import { formatAmount, toDisplayNumber } from '../loanFormat';
import {
  apiErrorMessage,
  type BorrowErrorKind,
  type BorrowRecoveryAction,
  borrowRecoveryAction,
} from './classifyBorrowError';
import {
  ACTION_LABEL,
  CANCEL_LABEL,
  errorCopy,
  type ErrorCopyContext,
  WARN_SECONDARY_LABEL,
} from './errorCopy';
import type { BorrowPreviewFigures } from './previewFigures';
import type {
  BorrowCancelReason,
  BorrowFlowState,
  BorrowPendingStep,
} from './useBorrowFlow';

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
 * kind's own; an unknown error only closes.
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
        action:
          state.error === 'unknown'
            ? 'close'
            : (action ?? borrowRecoveryAction(state.error, state.cause)),
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

/**
 * Each step's status (line 1519): before the current one done, the current
 * one active, the rest waiting; all waiting while confirming.
 */
const steps = (
  borrowSymbol: string | undefined,
  dialog: Exclude<BorrowDialogStep, { kind: 'done' }>,
): Step[] =>
  stepLabels(borrowSymbol).map((label, index) => {
    if (dialog.kind === 'confirm') {
      return { label, status: 'waiting' };
    }

    if (dialog.kind === 'cancelling') {
      // A declined signature failed the first step; an earlier request's
      // cancellation comes before this borrow's steps.
      return {
        label,
        status:
          index === 0 && dialog.reason === 'declined' ? 'failed' : 'waiting',
      };
    }

    if (dialog.kind === 'error') {
      const at = dialog.step ?? errorCopy[dialog.error].step;
      const warn = errorCopy[dialog.error].tone === 'warn';

      if (index < at) {
        return { label, status: 'done' };
      }

      if (index === at) {
        // A warning keeps the step running (`ac`, line 1519).
        return { label, status: warn ? 'active' : 'failed' };
      }

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

/**
 * A borrow picked up after a reload (`useRestoreBorrow`): the rows its
 * dialog showed, kept by `pendingBorrowStore`, or generic ones built from
 * the execution when nothing was kept.
 */
export type RestoredBorrowSummary = {
  executionId: string;
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
      className="mt-[16px]"
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
      <Button className="mt-[20px]" onClick={() => onAction(action)}>
        {action === copy.action && !fundsWaiting
          ? copy.button
          : ACTION_LABEL[action]}
      </Button>
      <div className="mt-[12px] text-center">
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

const sameStep = (a: BorrowDialogStep, b: BorrowDialogStep) =>
  a.kind === b.kind &&
  (a.kind !== 'pending' ||
    (b.kind === 'pending' && a.step === b.step && a.note === b.note)) &&
  (a.kind !== 'cancelling' ||
    (b.kind === 'cancelling' && a.reason === b.reason)) &&
  (a.kind !== 'error' ||
    (b.kind === 'error' &&
      a.error === b.error &&
      a.step === b.step &&
      a.action === b.action &&
      a.fundsWaiting === b.fundsWaiting &&
      a.executionId === b.executionId &&
      a.detail === b.detail));

type Shown = {
  step: BorrowDialogStep;
  summary: Summary;
  loan: BorrowDialogLoan | undefined;
  figures: BorrowPreviewFigures | undefined;
  restored: RestoredBorrowSummary | undefined;
};

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
  // An error before the dry run finished (a pre-check) has no figures. A
  // restored borrow has its rows instead, and is never confirmed here.
  const open =
    step !== undefined &&
    (loan !== undefined
      ? figures !== undefined || step.kind === 'error'
      : restored !== undefined && step.kind !== 'confirm');

  // The last content shown, so the popup keeps it while it animates out.
  const [shown, setShown] = useState<Shown>();

  if (
    open &&
    (!shown ||
      !sameStep(shown.step, step) ||
      shown.loan !== loan ||
      shown.figures !== figures ||
      shown.restored !== restored)
  ) {
    const summary = summaryOf(loan, figures, restored);

    if (summary) {
      setShown({ step, summary, loan, figures, restored });
    }
  }

  const current = open ? summaryOf(loan, figures, restored) : undefined;
  const content = open && current ? { step, summary: current } : shown;

  const kind = content?.step.kind;

  const step_ = content?.step;
  // Waiting for a deposit sent before a reload, or following a borrow the
  // user did not just confirm: nothing is asked of the user, so it closes.
  const earlierPending =
    step_?.kind === 'pending' && content?.summary.earlier === true;

  const closableWait =
    earlierPending ||
    (step_?.kind === 'pending' && step_.note === 'awaitingDeposit');

  let footer: ReactNode = null;

  if (step_?.kind === 'confirm') {
    // Lines 1013–1014: `.go` 20px above, then `.linkb` Cancel centred 12px
    // below.
    footer = (
      <>
        <Button className="mt-[20px]" onClick={onConfirm}>
          Confirm in wallet
        </Button>
        <div className="mt-[12px] text-center">
          <Button variant="link" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </>
    );
  } else if (step_?.kind === 'error') {
    footer = (
      <ErrorActions
        action={step_.action}
        error={step_.error}
        fundsWaiting={step_.fundsWaiting}
        onAction={onAction}
        onCancel={onCancel}
        onViewPosition={onViewPosition}
      />
    );
  } else if (step_?.kind === 'pending' || step_?.kind === 'cancelling') {
    // Line 1020: 14px `mut2`, centred, 20px above.
    footer = (
      <>
        <p
          className="m-0 mt-[20px] text-center text-[14px] leading-[normal] text-mut2"
          role="status">
          {step_.kind === 'pending'
            ? pendingNote(step_.note, content?.summary.borrowSymbol)
            : CANCEL_NOTE}
        </p>
        {closableWait ? (
          <Button className="mt-[20px]" onClick={onCancel}>
            {CLOSE}
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <Dialog
      closeButton={kind === 'confirm' || kind === 'error' || closableWait}
      dismissible={
        closableWait || (kind !== 'pending' && kind !== 'cancelling')
      }
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // A warning's window closes but the borrow is still tracked.
          if (
            content?.step.kind === 'error' &&
            errorCopy[content.step.error].tone === 'warn'
          ) {
            onAction('close');
          } else {
            onCancel();
          }
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
                  {content.summary.doneText}
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
              {content.step.kind === 'error' ? (
                <ErrorBanner
                  detail={content.step.detail}
                  error={content.step.error}
                  errorContext={content.summary.errorContext}
                  fundsWaiting={content.step.fundsWaiting}
                />
              ) : null}
              {earlierPending ? (
                <Banner
                  className="mt-[16px]"
                  title={EARLIER_TITLE}
                  tone="warning">
                  {EARLIER_TEXT}
                </Banner>
              ) : null}
              {content.step.kind === 'cancelling' ? (
                <Banner
                  className="mt-[16px]"
                  title={CANCEL_COPY[content.step.reason].title}
                  tone="warning">
                  {CANCEL_COPY[content.step.reason].text}
                </Banner>
              ) : null}
              {content.summary.rows ? (
                <Rows
                  rows={[...content.summary.rows, ...extraRows(content.step)]}
                />
              ) : null}
              {/* Line 1001: 16px above. */}
              <StepProgress
                aria-label="Loan progress"
                className="mt-[16px]"
                steps={steps(content.summary.borrowSymbol, content.step)}
              />
              {footer}
            </>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
