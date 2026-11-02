import { IntentsConnectError } from '@/errors';

export type FundingErrorCode =
  /** No address — the wallet is not connected or has not shared an account. */
  | 'WALLET_NOT_CONNECTED'
  /** The wallet signs with a standard this package cannot sign intents for. */
  | 'UNSUPPORTED_STANDARD'
  /** The user declined the transfer signature. Nothing moved. */
  | 'USER_REJECTED'
  /** The wallet failed to sign for another reason. Nothing moved. */
  | 'SIGNING_FAILED'
  /** A named NEAR account's key is not registered with `intents.near`. */
  | 'PUBLIC_KEY_NOT_REGISTERED'
  /** The quote or the intent to sign is not what was asked for. Not signed. */
  | 'PAYLOAD_MISMATCH'
  /** Confidential funding without an authorized user session. */
  | 'NOT_AUTHORIZED'
  /** Another funding of this account is still in progress. */
  | 'FUNDING_IN_FLIGHT'
  /** 1Click could not quote the swap. */
  | 'QUOTE_FAILED'
  /** The quote expired before the transfer was signed. Get a new one. */
  | 'QUOTE_EXPIRED'
  /** 1Click refused the signed transfer. */
  | 'SUBMIT_REJECTED'
  /** The swap was refunded to the intents (or confidential) account. */
  | 'REFUNDED'
  /** The swap failed. */
  | 'SWAP_FAILED'
  /** No final swap status in time. The funding can be resumed. */
  | 'STATUS_TIMEOUT'
  /** The swap succeeded but the funds were not seen at the recipient in time. */
  | 'ARRIVAL_TIMEOUT';

export type FundingErrorMeta = {
  depositAddress?: string;
  refundedAmount?: string;
  correlationId?: string;
};

export class FundingError extends IntentsConnectError {
  readonly meta: FundingErrorMeta;

  constructor(
    readonly code: FundingErrorCode,
    message: string,
    options?: { cause?: unknown; meta?: FundingErrorMeta },
  ) {
    super(message, options);
    this.name = 'FundingError';
    this.meta = options?.meta ?? {};
  }
}
