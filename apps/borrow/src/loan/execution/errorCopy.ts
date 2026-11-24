import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from './classifyBorrowError';

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
  /**
   * The error came before anything was signed or sent (a pre-check, the dry
   * run, or creating the execution): the dialog's steps are all waiting.
   */
  beforeSigning?: boolean;
};

export type ErrorCopy = {
  title: (context: ErrorCopyContext) => string;
  text: (context: ErrorCopyContext) => string;
  /** The primary button, for the table's own action. */
  button: string;
  /** The table's action; the hook may offer another one (see below). */
  action: BorrowRecoveryAction;
  /** `warn` is a warning, not an error: the borrow is still tracked. */
  tone: 'error' | 'warn';
  /**
   * The step the error is drawn on (`errStep` of each artboard), 0-based:
   * earlier steps are marked done and this one failed. `null` marks none,
   * for an error before anything was signed. The flow overrides it with
   * where the borrow really was (`useBorrowFlow`'s error `step`).
   */
  step: 0 | 1 | 2 | null;
};

export const errorCopy: Record<BorrowErrorKind, ErrorCopy> = {
  // `rejected`.
  rejected: {
    title: () => 'Signature rejected',
    text: () => 'You declined the request in your wallet. Nothing was spent.',
    button: 'Try again',
    action: 'retry',
    tone: 'error',
    step: 0,
  },
  // `gas`. The artboard's amounts are not known here.
  noGas: {
    title: () => 'Not enough for the network fee',
    text: ({ chainName }) =>
      `Your wallet needs more of ${chainName}’s gas token to cover the network fee. Add some and try again.`,
    button: 'Try again',
    action: 'retry',
    tone: 'error',
    step: 0,
  },
  // No artboard: 1Click can't quote the amount, so the create call failed
  // and nothing was sent; back to the form for another amount or asset.
  noRoute: {
    title: () => 'No route for this amount',
    text: ({ collateralSymbol }) =>
      `We couldn’t find a route to bring this amount in as ${collateralSymbol}, often because it is too small to cover the network fees. Nothing was sent. Try a larger amount, or another asset or chain.`,
    button: 'Back to the form',
    action: 'close',
    tone: 'error',
    step: null,
  },
  // No artboard: the two-pass dry run's minimum received fell by more than
  // its buffer, before anything was signed. On a steps-only retry the
  // collateral already arrived and is held (`fundsWaiting`); the dialog then
  // draws it past the deposit.
  quoteChanged: {
    title: () => 'The quote changed',
    text: ({ fundsWaiting }) =>
      fundsWaiting
        ? 'The fee changed while the borrow was being prepared, so it was not sent. Your collateral arrived and is held for this loan. Try again to borrow against it.'
        : 'The quote changed while the loan was being prepared. Nothing was signed — review the new terms.',
    button: 'Refresh quote',
    action: 'refresh',
    tone: 'error',
    step: null,
  },
  // `ltv` ("Collateral price moved"); its button refreshes the quote. Only
  // the borrow step failing after the collateral arrived (diagnosed above
  // the max LTV at the market's prices now), or the SDK's `QUOTE_MOVED`
  // guard, which refuses before anything is sent.
  priceMoved: {
    title: () => 'Collateral price moved',
    text: ({ collateralSymbol, marketName, fundsWaiting }) =>
      fundsWaiting
        ? `${collateralSymbol}’s price moved while the loan was opening: at ${marketName}’s prices now it would be above the maximum LTV, so the borrow did not go through. Your collateral arrived and is held for this loan.`
        : `The price of ${collateralSymbol} moved since this quote, so its terms no longer hold. Nothing was sent. Review the new quote.`,
    button: 'Refresh quote',
    action: 'refresh',
    tone: 'error',
    step: 1,
  },
  // `mktliq`; the artboard's "edit" is leaving to the form, i.e. `close`.
  noLiquidity: {
    title: ({ marketName }) => `Not enough to borrow in ${marketName}`,
    text: ({ marketName, borrowSymbol, fundsWaiting }) =>
      fundsWaiting
        ? `${marketName} could not lend ${borrowSymbol} when the loan was opening, so the borrow did not go through. Your collateral arrived and is held for this loan.`
        : `${marketName} can’t lend that much ${borrowSymbol} right now. Borrow less or pick another market.`,
    button: 'Choose another market',
    action: 'close',
    tone: 'error',
    step: 1,
  },
  // `delayed`.
  delayed: {
    title: () => 'Taking longer than usual',
    text: () =>
      'The destination chain is slow right now. Your funds are held safely by the intent and will arrive, or be refunded automatically. You can close this window; we keep tracking it.',
    button: 'Close and keep tracking',
    action: 'close',
    tone: 'warn',
    step: 2,
  },
  // No artboard: a generic fallback with a close action. Before signing
  // nothing left the wallet, so it is not sent there to look.
  unknown: {
    title: () => 'Something went wrong',
    text: ({ beforeSigning }) =>
      beforeSigning
        ? 'The loan could not be prepared, and nothing was sent from your wallet. Close this and try again.'
        : 'The loan could not be completed. Check your wallet for what was sent, then try again.',
    button: 'Close',
    action: 'close',
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
