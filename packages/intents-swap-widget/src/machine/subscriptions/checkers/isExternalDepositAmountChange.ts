import type { Context, ContextChange } from '@/machine/context';

/**
 * External deposits are always quoted as FLEX_INPUT, so the amount is not part
 * of the request — editing it has nothing to invalidate. Letting it through
 * would reset the quote and hand out a fresh deposit address on every
 * keystroke, replacing the QR code the user is looking at.
 *
 * Scoped to changes that are *only* amounts: a token, address or deposit-mode
 * change does alter the request and still has to invalidate the quote.
 */
export const isExternalDepositAmountChange = (
  ctx: Context,
  changes: ContextChange[],
) => {
  if (!ctx.isDepositFromExternalWallet) {
    return false;
  }

  const keys = changes.map((change) => change?.key).filter(Boolean);

  return (
    keys.length > 0 &&
    keys.every(
      (key) => key === 'sourceTokenAmount' || key === 'targetTokenAmount',
    )
  );
};
