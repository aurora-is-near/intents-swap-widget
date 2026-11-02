import { IntentsConnectError } from '@/errors';

/**
 * Every NEAR RPC endpoint failed for transport reasons (network, timeout,
 * non-2xx, a node-side error). Says nothing about the contract or account.
 */
export class NearRpcError extends IntentsConnectError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NearRpcError';
  }
}

/**
 * The contract itself rejected the call (it panicked, or the method/contract
 * does not exist). Deterministic — another endpoint would answer the same, so
 * this is never retried on a fallback URL.
 */
export class NearContractError extends IntentsConnectError {
  constructor(
    message: string,
    readonly contractId: string,
    readonly methodName: string,
  ) {
    super(message);
    this.name = 'NearContractError';
  }
}

/** The queried account does not exist on chain. */
export class NearUnknownAccountError extends IntentsConnectError {
  constructor(readonly accountId: string) {
    super(`NEAR account ${accountId} does not exist`);
    this.name = 'NearUnknownAccountError';
  }
}
