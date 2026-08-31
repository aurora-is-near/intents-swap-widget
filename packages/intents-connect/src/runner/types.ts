import type { IntentsConnectApi } from '@/api/types';
import type { Logger } from '@/logger';
import type {
  Execution,
  ExecutionStatus,
  FeeStrategy,
  QuoteRequest,
} from '@/types/execution';
import type { Recipe } from '@/types/recipe';
import type { MakeTransfer, TransferPlugins } from '@/types/transfer';
import type { WalletConnector } from '@/types/wallet';
import type { ExecutionMachineStore } from '@/machine/machine';
import type { Phase } from '@/machine/phases';

export type RunnerEvent =
  | { type: 'phase'; phase: Phase }
  | { type: 'status'; status: ExecutionStatus }
  | { type: 'created'; executionId: string }
  /** Exact figures. Only emitted by the `threeRound` fee strategy. */
  | { type: 'quoted'; networkFee: string; spendable: string }
  /** Never emitted before the signature is submitted. */
  | {
      type: 'deposit-address';
      address: string;
      memo: string | null;
      deadline?: string;
    }
  | { type: 'deposit-sent'; txHash: string }
  | { type: 'error'; error: Error };

export type OriginToken = {
  /** Absent means the chain's native gas asset. */
  contractAddress?: string;
  decimals: number;
};

export type ExecutionPlan<TParams = void> = {
  recipe: Recipe<TParams>;
  params: TParams;
  quote: QuoteRequest;
  /** Defaults to `{ kind: 'placeholder' }` — one round, service carves the fee. */
  feeStrategy?: FeeStrategy;
  /** Lowercase chain id of the origin asset, e.g. `base`, `sol`, `btc`. */
  originChain: string;
  originToken: OriginToken;
  /**
   * `false` routes to the QR / exchange path: no wallet transfer, no
   * `deposit/submit`, settlement observed by the backend's deposit watcher.
   */
  depositViaWallet: boolean;
  /**
   * EVM origins: the chain the deposit transfer must run on, and what arms the
   * network-mismatch guard.
   *
   * Defaulted from the built-in `EVM_CHAIN_IDS` registry, so it is only needed
   * for an EVM chain the registry does not know. It is NOT merely advisory —
   * the EVM transfer path refuses to run without one — which is why it is
   * filled in rather than left to fail after the signature.
   */
  originChainId?: number | null;
};

export type ExecutionRunnerOptions = {
  api: IntentsConnectApi;
  /**
   * Supplies the address, signing standard, providers and (usually) transfers.
   *
   * Accepts an accessor as well as a value. Pass an accessor when the connector
   * object is rebuilt on every render (most React connectors are): the runner
   * then always reads the current one, so its own identity can stay stable and a
   * live execution is not thrown away by an unrelated re-render.
   */
  wallet: WalletConnector | (() => WalletConnector);
  /**
   * Escape hatch: widget network plugins keyed by chain family. Used when the
   * connector has no `makeTransfer` of its own.
   */
  plugins?: TransferPlugins;
  /**
   * Options forwarded to a plugin's `makeTransfer`.
   *
   * Single-family setups pass the plugin's options directly (usually
   * `{ provider }`). Multi-chain setups namespace them by chain family —
   * `{ evm: { provider }, sol: { provider }, near: { wallet } }` — because
   * each family's plugin expects a different, incompatible shape; the runner
   * hands each plugin only its own slice.
   */
  pluginOptions?: unknown;
  /** Overrides both of the above. */
  makeTransfer?: MakeTransfer<void>;
  logger?: Logger;
  /**
   * When the user REJECTS the signing prompt during `run()`, immediately offer
   * the `delete_execution` signature so the created execution does not stay
   * holding the per-wallet in-flight lock — the next `run()` then starts clean
   * instead of demanding an explicit resume-or-cancel decision. Declining that
   * second prompt falls back to the normal recovery. Defaults to `true`.
   */
  autoCancelOnSignatureRejection?: boolean;
  /** Defaults to 3_000. */
  pollIntervalMs?: number;
  /** Defaults to 240 (~12 minutes at the default interval). */
  maxPollAttempts?: number;
  onEvent?: (event: RunnerEvent) => void;
};

/**
 * Optional origin details for `resume()`, filling in what an execution alone
 * cannot answer when the deposit transfer has to be rebuilt without the
 * original plan (a page reload lost it):
 *
 * - EVM origins need none of this — chain and token address are decoded from
 *   `quote.originAsset` and the chain id from the built-in registry; pass
 *   `originChainId` only for a chain the registry does not know.
 * - Every other family (`sol`, `stellar`, `near`) formats amounts with the
 *   token's decimals, so `originToken` is REQUIRED there — without it the
 *   deposit address is surfaced for a manual transfer instead.
 */
export type ResumeDepositOptions = {
  originToken?: OriginToken;
  originChainId?: number | null;
  /**
   * `false` skips any wallet-transfer attempt (QR / exchange deposits).
   *
   * `true` additionally FORCES the transfer for a cross-session resume of a
   * `DEPOSIT_PENDING` execution, where the runner cannot tell a transfer that
   * never ran from one already broadcast and not yet observed. Left unset,
   * that case only surfaces the deposit address, so funds are never sent
   * twice; pass `true` when the caller knows no deposit was made.
   */
  depositViaWallet?: boolean;
};

export type ExecutionRunner = {
  /** Drives the full bridge-in lifecycle and resolves on a terminal status. */
  run: <TParams>(plan: ExecutionPlan<TParams>) => Promise<Execution>;
  /**
   * Reattaches to an execution after a reload and resumes from wherever it
   * actually got — including driving the deposit transfer for a signed but
   * unfunded execution (see `ResumeDepositOptions`).
   */
  resume: (
    executionId: string,
    options?: ResumeDepositOptions,
  ) => Promise<Execution>;
  /**
   * Re-prompts the deposit transfer after it was rejected or failed
   * (`DepositTransferError`) — the execution is still valid and signed.
   */
  retryDeposit: () => Promise<Execution>;
  /** Clears the in-flight lock by signing `delete_execution:{id}`. */
  cancel: (executionId?: string) => Promise<void>;
  /**
   * Permanently detaches the runner from its wallet: every in-flight stage
   * stops at its next checkpoint and no further wallet or API side effect is
   * performed. Call it when the bound wallet/account changes — the execution
   * itself is untouched and can be `resume()`d from a correctly bound runner.
   */
  dispose: () => void;
  /**
   * Whether `dispose()` has been called. Disposal is irreversible, so a
   * holder that may have raced a deferred dispose (e.g. a React binding whose
   * cleanup and re-setup were separated) can detect a dead runner and rebuild
   * instead of keeping one whose every call rejects.
   */
  isDisposed: () => boolean;
  getPhase: () => Phase;
  /** The valtio store, for framework bindings. */
  getStore: () => ExecutionMachineStore;
};
