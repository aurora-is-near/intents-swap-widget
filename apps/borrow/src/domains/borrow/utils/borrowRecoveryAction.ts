import { assertNever } from '@/utils/assertNever';

import type { BorrowErrorKind } from './classifyBorrowError';

/**
 * What an error state's button does, by the artboard's action names
 * (`Web-Borrow-Confirm.dc.html` lines 1493–1505 and 1513):
 * - `retry`: run again (rejected, no gas), send the declined deposit
 *   again, or confirm the declined cancellation again;
 * - `refresh`: re-quote and confirm again (the quote or the price moved);
 * - `reconnect`: connect the wallet again (it left mid-borrow);
 * - `close`: close the dialog, tracking a live borrow on (delayed), or back
 *   to the form to borrow less or pick another market (no liquidity, the
 *   artboard's "Choose another market") or another pair (pair unsupported),
 *   to wait for the borrow already on its way (busy), or after an error
 *   nothing explains (unknown).
 */
export type BorrowRecoveryAction = 'retry' | 'refresh' | 'reconnect' | 'close';

export const borrowRecoveryAction = (
  kind: BorrowErrorKind,
): BorrowRecoveryAction => {
  switch (kind) {
    case 'priceMoved':
    case 'quoteMoved':
      return 'refresh';
    case 'walletDisconnected':
      return 'reconnect';
    case 'noLiquidity':
    case 'delayed':
    case 'pairUnsupported':
    case 'busy':
    case 'unknown':
      return 'close';
    case 'rejected':
    case 'depositRejected':
    case 'cancelDeclined':
    case 'noGas':
      return 'retry';
    default:
      return assertNever(kind, 'borrow error kind');
  }
};
