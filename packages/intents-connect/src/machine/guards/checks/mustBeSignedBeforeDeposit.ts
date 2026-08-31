import { failGuard } from '@/errors';

/**
 * Signing happens BEFORE the deposit: the service holds a pre-signed batch and
 * fires it the moment the bridge settles.
 *
 * So a deposit address must never reach the user — as a QR code or otherwise —
 * until the signature is submitted, or funds can arrive with no batch to fire.
 */
export const mustBeSignedBeforeDeposit = (hasSubmittedSignature: boolean) => {
  if (!hasSubmittedSignature) {
    failGuard(
      'DEPOSIT_BEFORE_SIGNATURE',
      'refusing to expose a deposit address before the intent signature is submitted',
    );
  }
};
