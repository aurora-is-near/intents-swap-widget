import type { ExecutionMetadata } from '@/api/types';
import type { FetchLike } from '@/http';
import type {
  ExecutionStep,
  ExecutionType,
  QuoteRequest,
} from '@/types/execution';

export type IntentsConnectActionsApiOptions = {
  /** The actions API origin, e.g. `https://intents-connect-actions-demo.aurora.dev`. */
  baseUrl: string;
  /** Defaults to global `fetch`. */
  fetch?: FetchLike;
  /** Milliseconds. Defaults to 15_000. */
  timeout?: number;
};

/** One action version in `GET /api/v1/actions`. */
export type ActionCatalogEntry = {
  /** Stable lowercase id, e.g. `aave-v3-borrow`. */
  id: string;
  /** Unsigned integer; each version is kept for callers that pin it. */
  version: number;
  name: string;
  description: string;
  templateFormat: 'starlark';
  /** Backend chain ids the action resolves to, e.g. `["base", "arb"]`. */
  supportedChains: string[];
  /** JSON Schema 2020-12 of the action's `inputs`. */
  inputSchema: Record<string, unknown>;
  /** The Starlark source. */
  script: string;
  /** Lowercase hex SHA-256 of the definition bytes, a NUL byte and the script bytes. */
  sha256Hash: string;
};

export type ResolveActionRequest = {
  version: number;
  /**
   * Pins the exact definition and script: a different server hash answers
   * 409 (`IntentsConnectActionsApiError.isHashMismatch`) before the script runs.
   */
  expectedSha256Hash?: string;
  inputs: Record<string, unknown>;
};

/**
 * The execution creation body an action resolves to. A body with `quote` goes
 * to `POST /api/v1/executions/{wallet}` (bridge-in, or an out-operation with
 * `outOperation: true`); one with a top-level `destinationAsset` goes to
 * `/steps`. Backend placeholders such as `{INTERMEDIARY}` and
 * `{MIN_AMOUNT_OUT}` are left in for creation to substitute.
 */
export type ResolvedExecution = {
  version: '1.0';
  type: ExecutionType;
  quote?: QuoteRequest;
  destinationAsset?: string;
  outOperation?: boolean;
  dry?: boolean;
  metadata?: ExecutionMetadata;
  steps: ExecutionStep[];
  addressLookupTables?: string[];
  publicKey?: string;
};

/** `POST /api/v1/actions/{id}/resolve`. */
export type ActionResolution = {
  actionId: string;
  version: number;
  /** Derived by the server from the execution's asset. */
  executionChain: string;
  actionSha256Hash: string;
  execution: ResolvedExecution;
};

export type IntentsConnectActionsApi = {
  listActions: () => Promise<ActionCatalogEntry[]>;
  resolveAction: (
    actionId: string,
    request: ResolveActionRequest,
  ) => Promise<ActionResolution>;
};
