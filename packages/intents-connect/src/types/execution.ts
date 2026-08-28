import type { SigningPayload, SigningStandard } from '@/types/signing';

export type Chain = string;

/** Which endpoint shape an execution uses. v1 implements `bridge-in` only. */
export type FlowShape = 'bridge-in';

export type SwapType = 'EXACT_INPUT' | 'EXACT_OUTPUT';

export type ExecutionType = 'evm' | 'solana';

/**
 * Server-side status. Authoritative, polled, eventually consistent.
 *
 * `EXPIRED` is NOT hard-terminal: a deposit that settles late can revive an
 * execution straight to `OPERATION_PROCESSING`.
 */
export type ExecutionStatus =
  | 'CREATED'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_PROCESSING'
  | 'OPERATION_PENDING'
  | 'OPERATION_PROCESSING'
  | 'SUCCESS'
  | 'DEPOSIT_FAILED'
  | 'OPERATION_FAILED'
  | 'EXPIRED';

export const TERMINAL_STATUSES: readonly ExecutionStatus[] = [
  'SUCCESS',
  'DEPOSIT_FAILED',
  'OPERATION_FAILED',
];

/**
 * Statuses for which the service still holds the per-(intermediary, chain)
 * in-flight lock, so a `dry: false` create would answer 409.
 *
 * `EXPIRED` is excluded: the deadline has passed and a new execution is exactly
 * what the user needs, even though a late deposit could still revive the old one.
 */
export const IN_FLIGHT_STATUSES: readonly ExecutionStatus[] = [
  'CREATED',
  'DEPOSIT_PENDING',
  'DEPOSIT_PROCESSING',
  'OPERATION_PENDING',
  'OPERATION_PROCESSING',
];

/**
 * Statuses that still mean "waiting on the user's funds": `CREATED` before
 * the signature, `DEPOSIT_PENDING` after it (the /submit response names the
 * same state SIGNED_PENDING_DEPOSIT). Everything later means the watcher has
 * observed the deposit.
 *
 * `EXPIRED` is deliberately excluded: the deadline has passed, so nothing is
 * "waiting" — but a late deposit still revives it, which is why `resume()`
 * treats EXPIRED as deposit-needing on top of this set.
 */
export const AWAITING_FUNDS_STATUSES: readonly ExecutionStatus[] = [
  'CREATED',
  'DEPOSIT_PENDING',
];

/** Status values `/submit` may answer with, which are not execution statuses. */
export type SubmitStatus =
  | 'SIGNED_PENDING_DEPOSIT'
  /** Out-operations only: already OPERATION_PENDING, no deposit needed. */
  | 'SIGNING'
  | ExecutionStatus;

/**
 * A step parameter: an ABI scalar as a string, or a nested array for a tuple /
 * array argument (the API allows up to 6 levels of nesting). Placeholders like
 * `{MIN_AMOUNT_OUT}` are valid anywhere a scalar is.
 */
export type StepParameter = string | StepParameter[];

/**
 * The ONLY five keys a step may carry. Any other key — including a differently
 * cased spelling or a duplicate — is rejected with 400.
 */
export type Step = {
  /** A contract address, or the `{DEPOSIT_ADDRESS}` placeholder. */
  to: string;
  /** Empty string means a bare value transfer with no calldata. */
  functionSignature: string;
  parameters: StepParameter[];
  /** Atomic amount, or an amount placeholder. */
  value: string;
  /** Passed through untouched by the backend. */
  metadata?: Record<string, unknown>;
};

export const MAX_STEPS: Readonly<Record<ExecutionType, number>> = {
  evm: 30,
  solana: 50,
};

export const MAX_FUNCTION_SIGNATURE_BYTES = 1024;

export const STEP_KEYS = [
  'to',
  'functionSignature',
  'parameters',
  'value',
  'metadata',
] as const;

/** Placeholders the backend substitutes server-side. Emit them literally. */
export const BACKEND_PLACEHOLDERS = {
  minAmountOut: '{MIN_AMOUNT_OUT}',
  depositAddress: '{DEPOSIT_ADDRESS}',
  amountIn: '{AMOUNT_IN}',
} as const;

export type QuoteRequest = {
  originAsset: string;
  destinationAsset: string;
  /** Atomic. Denominated in the origin token for EXACT_INPUT, destination for EXACT_OUTPUT. */
  amount: string;
  swapType: SwapType;
  /** Basis points. */
  slippageTolerance: number;
  /** ISO 8601. Drives the deposit-address validity countdown. */
  deadline?: string;
  /** Out-operation only. Sending it on a bridge-in is a 400. */
  recipient?: string;
};

export type ExecutionQuote = {
  amount: string;
  /** Deposit THIS for EXACT_OUTPUT. Never recompute it. */
  amountIn: string;
  amountOut: string;
  /** Already post-fee once a fee was estimated — do not subtract again. */
  minAmountOut: string;
  depositAddress: string;
  /** Stellar: required on both the transfer and `deposit/submit`. */
  depositMemo: string | null;
  /** ISO 8601. Echoed back from the request, so `resume` can recover it. */
  deadline?: string;
  recipient?: string;
  /** Echoed back from the request — lets `resume` rebuild the deposit leg. */
  originAsset?: string;
  destinationAsset?: string;
  swapType?: SwapType;
};

export type ExecutionDetails = {
  intermediaryAddress: string;
  /** Absent means gas estimation FAILED and amounts are still gross. */
  networkFee?: string;
  estimatedTime?: string;
  messageSigned?: boolean;
  messageToSign?: string;
  signingStandard?: SigningStandard;
  payload?: SigningPayload;
};

export type Execution = {
  id: string;
  createdAt?: string;
  status: ExecutionStatus;
  quote: ExecutionQuote;
  details: ExecutionDetails;
  /** Your steps plus the service's appended fee-transfer step. */
  steps: Step[];
  type?: ExecutionType;
  version?: string;
  transaction?: { evmTxHash?: string };
};

export type Intermediary = {
  originAccount: string;
  originType: 'evm' | 'solana' | 'near' | 'stellar' | 'tron' | 'ton';
  evm: string;
  solana: string | null;
};

/**
 * How the spendable amount is sized against the fee the service carves.
 *
 * Mutually exclusive by construction: `{MIN_AMOUNT_OUT}` exists to collapse the
 * three-round protocol into one call, so mixing them would mean two steps
 * operate on different amounts.
 */
export type FeeStrategy =
  /** One round. The service substitutes the post-fee amount server-side. */
  | { kind: 'placeholder' }
  /** Three rounds. You compute the amount and can show an exact figure first. */
  | { kind: 'threeRound' };
