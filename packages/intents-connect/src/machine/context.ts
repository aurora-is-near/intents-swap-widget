import type {
  Execution,
  ExecutionStatus,
  Intermediary,
} from '@/types/execution';
import type { Phase } from '@/machine/phases';

/**
 * Declared as a type alias rather than an interface so it keeps an implicit
 * index signature — some store helpers constrain context to
 * `Record<string, unknown>`, which interfaces do not satisfy.
 */
export type Context = {
  phase: Phase;

  intermediary?: Intermediary;

  executionId?: string;
  execution?: Execution;
  status?: ExecutionStatus;

  /** Present once a fee has been measured (threeRound) or reported. */
  networkFee?: string;
  /** The amount the steps may spend, post-fee. */
  spendable?: string;
  /** threeRound only: the amount actually baked into the created steps. */
  bakedAmount?: string;

  /** Only ever set after the signature is submitted. */
  depositAddress?: string;
  depositMemo?: string | null;
  /** ISO — the deposit-address validity deadline. */
  deadline?: string;
  depositTxHash?: string;

  hasSubmittedSignature: boolean;

  /**
   * A `delete_execution` signature / request is in flight.
   *
   * Deliberately NOT a phase: `cancel()` can be invoked from almost any point
   * in the lifecycle — including terminal phases, where a transition would be
   * refused — so cancelling is orthogonal to where the execution itself got
   * to. A UI needs it to say "sign to cancel" rather than mislabelling the
   * prompt with the phase it interrupted (e.g. "Awaiting signature").
   */
  isCancelling: boolean;

  error?: Error;
};

export const createInitialContext = (): Context => ({
  phase: 'idle',
  hasSubmittedSignature: false,
  isCancelling: false,
});
