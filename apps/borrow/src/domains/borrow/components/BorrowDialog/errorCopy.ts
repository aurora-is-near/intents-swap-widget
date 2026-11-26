import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from '../../utils/classifyBorrowError';

/*
 * The error dialogs' copy: the error table of Web-Borrow-Confirm.dc.html
 * (lines 1493–1505, `[title, text, button, action, tone]`), keyed by the
 * borrow error kind. The artboards' amounts and names are sample data, so a
 * text is a function of what the dialog knows about the loan.
 */

/** What a text can name about the loan. */
export type ErrorCopyContext = {
  /** The chain the wallet pays from, where the deposit's gas is spent. */
  chainName: string;
  collateralSymbol: string;
  borrowSymbol: string;
  marketName: string;
  /**
   * The collateral already arrived and is held for this loan, but the borrow
   * step failed (`useBorrowFlow().fundsWaiting`).
   */
  fundsWaiting?: boolean;
};

export type ErrorCopy = {
  title: (context: ErrorCopyContext) => string;
  text: (context: ErrorCopyContext) => string;
  /**
   * The primary button, for the kind's own action (`borrowRecoveryAction`);
   * another action the flow offers gets its `ACTION_LABEL`.
   */
  button: string;
  /** `warn` is a warning, not an error: the borrow is still tracked. */
  tone: 'error' | 'warn';
  /**
   * The step the error is drawn on (`errStep` of each artboard), 0-based,
   * when the flow does not say how far the borrow got (`useBorrowFlow`'s
   * error `step` wins).
   */
  step: 0 | 1 | 2;
};

export const errorCopy: Record<BorrowErrorKind, ErrorCopy> = {
  // `rejected`.
  rejected: {
    title: () => 'Signature rejected',
    text: () => 'You declined the request in your wallet. Nothing was spent.',
    button: 'Try again',
    tone: 'error',
    step: 0,
  },
  // No artboard: signed, then the deposit transaction was declined. The
  // signed execution holds the wallet until the deposit is sent, or the next
  // borrow cancels it.
  depositRejected: {
    title: () => 'Deposit not sent',
    text: () =>
      'You signed the request but declined the deposit transaction, so nothing left your wallet. Send the deposit to open the loan, or cancel and start again later.',
    button: 'Send deposit',
    tone: 'error',
    step: 0,
  },
  // No artboard: the cancellation of an open, unsigned (or never funded)
  // request was declined, so it still holds the wallet.
  cancelDeclined: {
    title: () => 'Request still open',
    text: () =>
      'You declined the cancellation, so the earlier request still blocks new borrows from this wallet. Nothing was sent. Confirm the cancellation in your wallet to continue, or wait about 10 minutes for it to expire.',
    button: 'Confirm cancellation',
    tone: 'error',
    step: 0,
  },
  // No artboard: another borrow from this wallet is on its way (its deposit
  // left the wallet, or may have), so a new one can't start yet.
  busy: {
    title: () => 'A borrow is already in progress',
    text: () =>
      'A previous borrow from this wallet is still on its way. Wait for it to finish before starting a new one; nothing was sent for this one.',
    button: 'Close',
    tone: 'error',
    step: 0,
  },
  // No artboard: the bridge quote changed between the dry run and the
  // signature.
  quoteMoved: {
    title: () => 'Quote changed',
    text: () =>
      'The bridge quote changed before you signed. Nothing was sent. Review the new quote.',
    button: 'Refresh quote',
    tone: 'error',
    step: 0,
  },
  // No artboard: the wallet disconnected mid-borrow. Reconnecting resumes a
  // borrow whose deposit left the wallet, else quotes it again (or, with the
  // collateral waiting, runs the steps-only retry).
  walletDisconnected: {
    title: () => 'Wallet disconnected',
    text: ({ fundsWaiting }) =>
      fundsWaiting
        ? 'Your wallet disconnected before the loan opened. Your collateral arrived and is held for this loan. Reconnect to continue.'
        : 'Your wallet disconnected before the borrow finished. Reconnect it to pick up where it stopped.',
    button: 'Reconnect wallet',
    tone: 'error',
    step: 0,
  },
  // `gas`. The artboard's amounts are not known here.
  noGas: {
    title: () => 'Not enough for the network fee',
    text: ({ chainName }) =>
      `Your wallet needs more of ${chainName}’s gas token to cover the network fee. Add some and try again.`,
    button: 'Try again',
    tone: 'error',
    step: 0,
  },
  // `ltv` ("Collateral price moved"); its button refreshes the quote.
  priceMoved: {
    title: () => 'Collateral price moved',
    text: ({ collateralSymbol, marketName, fundsWaiting }) =>
      fundsWaiting
        ? `${collateralSymbol} fell while the loan was opening, so it would now be above ${marketName}’s maximum LTV and the borrow did not go through. Your collateral arrived and is held for this loan.`
        : `${collateralSymbol} fell while the loan was opening, so it would now be above ${marketName}’s maximum LTV and the borrow did not go through.`,
    button: 'Refresh quote',
    tone: 'error',
    step: 2,
  },
  // `mktliq`; the artboard's "edit" is leaving to the form, i.e. `close`.
  noLiquidity: {
    title: ({ marketName }) => `Not enough to borrow in ${marketName}`,
    text: ({ marketName, borrowSymbol, fundsWaiting }) =>
      fundsWaiting
        ? `${marketName} could not lend ${borrowSymbol} when the loan was opening, so the borrow did not go through. Your collateral arrived and is held for this loan.`
        : `${marketName} can’t lend that much ${borrowSymbol} right now. Borrow less or pick another market.`,
    button: 'Choose another market',
    tone: 'error',
    step: 1,
  },
  // `delayed`.
  delayed: {
    title: () => 'Taking longer than usual',
    text: () =>
      'The destination chain is slow right now. Your funds are held safely by the intent and will arrive, or be refunded automatically. You can close this window; we keep tracking it.',
    button: 'Close and keep tracking',
    tone: 'warn',
    step: 2,
  },
  // No artboard: a borrow started on a pair the borrow action no longer
  // covers (`coming-soon`). Its steps can't be built, so it is never
  // retried; the form offers only covered pairs.
  pairUnsupported: {
    title: () => 'This pair is no longer supported',
    text: ({ marketName, collateralSymbol, borrowSymbol, fundsWaiting }) =>
      fundsWaiting
        ? `Borrow no longer opens ${marketName} loans of ${borrowSymbol} against ${collateralSymbol}, so this borrow can’t be retried. Your collateral arrived and is held for this loan.`
        : `Borrow no longer opens ${marketName} loans of ${borrowSymbol} against ${collateralSymbol}. Nothing was sent. Pick another pair.`,
    button: 'Choose another pair',
    tone: 'error',
    step: 1,
  },
  // No artboard: a generic fallback with a close action.
  unknown: {
    title: () => 'Something went wrong',
    text: () =>
      'The loan could not be completed. Check your wallet for what was sent, then try again.',
    button: 'Close',
    tone: 'error',
    step: 0,
  },
};

/** The button when the hook offers another action than the table's. */
export const ACTION_LABEL: Record<BorrowRecoveryAction, string> = {
  retry: 'Try again',
  refresh: 'Refresh quote',
  reconnect: 'Reconnect wallet',
  close: 'Close',
};

/** The secondary button: line 1513. */
export const CANCEL_LABEL = 'Cancel';
export const WARN_SECONDARY_LABEL = 'Go to my positions';
