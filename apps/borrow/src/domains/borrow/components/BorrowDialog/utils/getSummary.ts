import { formatApr, formatBps } from '@/domains/markets/utils/format';
import { formatAddress } from '@/utils/formatAddress';
import { formatAmount, toDisplayNumber } from '@/domains/loan/utils/loanFormat';

import type { BorrowPreviewFigures } from '../../../utils/previewFigures';
import type { BorrowDialogStep } from './getBorrowDialogStep';
import type { ErrorCopyContext } from './getErrorCopy';

/*
 * What the dialog says about the borrow: the rows, the borrowed token and
 * the words its error and done copy use, from the loan and the dry run's
 * figures, or from a borrow restored after a reload.
 */

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

/** One row of the dialog's summary. */
export type SummaryRow = [label: string, value: string];

/**
 * A borrow picked up after a reload (`useRestoreBorrow`): the rows its
 * dialog showed, kept by `pendingBorrowStore`, or generic ones built from
 * the execution when nothing was kept.
 */
export type RestoredBorrowSummary = {
  rows: SummaryRow[];
  borrowSymbol?: string;
};

/** What the dialog says, from the loan and its figures or a restored summary. */
export type Summary = {
  rows: SummaryRow[] | undefined;
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

const amountOf = (amount: bigint, decimals: number) =>
  formatAmount(toDisplayNumber(amount, decimals));

/**
 * The rows (line 1452), from the dry run. The fee is the dry run's own, in
 * the collateral it is taken from, so the borrowed amount is received
 * whole. When the paid token is converted into the collateral, the rows
 * also say what is paid, the rate and the least collateral that arrives
 * (what is supplied).
 */
export const getConfirmRows = (
  loan: BorrowDialogLoan,
  figures: BorrowPreviewFigures,
): SummaryRow[] => {
  const { paid, collateral, borrow, market } = loan;
  const converted = figures.rate !== undefined;
  const collateralOf = (amount: bigint) =>
    `${amountOf(amount, collateral.decimals)} ${collateral.symbol}`;

  const borrowed = `${amountOf(figures.borrowAmount, borrow.decimals)} ${borrow.symbol}`;

  const paidRows: SummaryRow[] = converted
    ? [
        [
          'You pay',
          `${amountOf(paid.amount, paid.decimals)} ${paid.symbol} · ${paid.chainName}`,
        ],
      ]
    : [];

  const rateRows: SummaryRow[] =
    figures.rate === undefined
      ? []
      : [
          ['Rate', `1 ${paid.symbol} ≈ ${collateralOf(figures.rate)}`],
          ['Minimum received', collateralOf(figures.minimumReceived)],
        ];

  return [
    ...paidRows,
    [
      'Supply',
      `${converted ? '≈ ' : ''}${collateralOf(figures.collateralExpected)} · ${market.chainLabel}`,
    ],
    ...rateRows,
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

/** A restored borrow's error copy names nothing it doesn't know. */
const RESTORED_ERROR_CONTEXT: Summary['errorContext'] = {
  chainName: 'the paying chain',
  collateralSymbol: 'The collateral',
  borrowSymbol: 'that token',
  marketName: 'the market',
};

export const getSummary = (
  loan: BorrowDialogLoan | undefined,
  figures: BorrowPreviewFigures | undefined,
  restored: RestoredBorrowSummary | undefined,
): Summary | undefined => {
  if (loan) {
    return {
      rows: figures ? getConfirmRows(loan, figures) : undefined,
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
export const getExtraRows = (step: BorrowDialogStep): SummaryRow[] => {
  if (step.kind === 'error' && step.executionId) {
    return [['Execution', step.executionId]];
  }

  return [];
};
