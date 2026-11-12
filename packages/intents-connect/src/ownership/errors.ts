import { IntentsConnectError } from '@/errors';

export type OwnershipErrorCode =
  /** No address — the wallet is not connected or has not shared an account. */
  | 'WALLET_NOT_CONNECTED'
  /** The wallet signs with a standard ownership proofs do not support yet. */
  | 'UNSUPPORTED_STANDARD'
  /** The user declined the signature prompt. */
  | 'USER_REJECTED'
  /** The wallet failed to sign for another reason. */
  | 'SIGNING_FAILED';

export class OwnershipError extends IntentsConnectError {
  constructor(
    readonly code: OwnershipErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'OwnershipError';
  }
}
