import type {
  Execution,
  ExecutionStatus,
  ExecutionType,
  Intermediary,
  QuoteRequest,
  Step,
  SubmitStatus,
} from '@/types/execution';
import type {
  DeleteSignatureEnvelope,
  SignatureEnvelope,
} from '@/types/signing';

export type ExecutionMetadata = {
  title: string;
  intent: string;
  url?: string;
  [key: string]: unknown;
};

export type CreateExecutionBody = {
  version: '1.0';
  type: ExecutionType;
  quote: QuoteRequest;
  steps: Step[];
  metadata: ExecutionMetadata;
  dry: boolean;
  outOperation?: boolean;
  /** Required for a TON origin — a TON address cannot yield its public key. */
  publicKey?: string;
};

export type SubmitSignatureBody = SignatureEnvelope & {
  executionId: string;
};

export type RecordDepositBody = {
  txHash: string;
  depositAddress: string;
  /** Required for MEMO-mode origins (Stellar) — a 404 without it. */
  memo?: string;
};

/**
 * Steps-only execution: no 1Click quote — the intermediary is expected to
 * already hold the destination token. Non-dry responses carry a signing
 * payload in `details`, exactly like a bridge-in create.
 */
export type CreateStepsExecutionBody = {
  version: '1.0';
  /** Defaults to `evm` server-side when omitted. */
  type?: ExecutionType;
  /** 1Click asset id of the destination token. */
  destinationAsset?: string;
  steps: Step[];
  metadata?: ExecutionMetadata;
  dry: boolean;
  /** Solana destinations only — base58 Address Lookup Table accounts. */
  addressLookupTables?: string[];
  /** Required for a TON origin — a TON address cannot yield its public key. */
  publicKey?: string;
};

export type SupportedToken = {
  assetId?: string;
  blockchain?: string;
  contractAddress?: string;
  decimals?: number;
  price?: number;
  priceUpdatedAt?: string;
  symbol?: string;
};

export type SupportedTokensResult = {
  in?: SupportedToken[];
  out?: SupportedToken[];
};

export type SupportedTokensFlow = 'inOperation' | 'outOperation';

export type ListExecutionsQuery = {
  id?: string;
  /**
   * A single status or several. The API accepts a comma-separated list, which is
   * what lets one call cover every status holding the in-flight lock.
   */
  status?: ExecutionStatus | readonly ExecutionStatus[];
};

/**
 * The full call surface of the Intents Connect API.
 *
 * `x-api-key` is attached to the create calls only. It fetches a 1Click quote
 * and prices per-key fees, so it is required on every create round — dry or
 * not — and is neither required nor sent on the others.
 */
export type IntentsConnectApi = {
  getIntermediary: (
    wallet: string,
    options?: { publicKey?: string },
  ) => Promise<Intermediary>;

  createExecution: (
    wallet: string,
    body: CreateExecutionBody,
  ) => Promise<Execution>;

  /** Steps-only execution — spends the intermediary's existing balance. */
  createStepsExecution: (
    wallet: string,
    body: CreateStepsExecutionBody,
  ) => Promise<Execution>;

  /** Token lists the API currently supports, cached server-side from 1Click. */
  listSupportedTokens: (
    flow?: SupportedTokensFlow,
  ) => Promise<SupportedTokensResult>;

  submitSignature: (
    wallet: string,
    body: SubmitSignatureBody,
  ) => Promise<{ status: SubmitStatus }>;

  recordDeposit: (body: RecordDepositBody) => Promise<void>;

  /** The API answers with an ARRAY even when filtering by a single id. */
  listExecutions: (
    wallet: string,
    query?: ListExecutionsQuery,
  ) => Promise<Execution[]>;

  deleteExecution: (
    wallet: string,
    executionId: string,
    signature: DeleteSignatureEnvelope,
  ) => Promise<void>;
};
