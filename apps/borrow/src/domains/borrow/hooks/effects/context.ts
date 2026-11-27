import type { RefObject } from 'react';
import type {
  UseExecutionResult,
  useIntentsConnect,
} from '@aurora-is-near/intents-connect/react';

import type { BorrowEffect, BorrowEvent } from '../../flow/events';
import type { UseBorrowFlowOptions } from '../../flow/types';

/** What the hook read on its latest render, for effects that run later. */
export type Latest = {
  api: ReturnType<typeof useIntentsConnect>['api'];
  /** The connected wallet. */
  wallet: string | undefined;
  isConnected: boolean;
  connect: () => Promise<void>;
  callbacks: UseBorrowFlowOptions;
};

/** What the effect runners reach of `useBorrowFlow`. */
export type EffectContext = {
  /** Feeds an event to the machine; resolves once its effects settle. */
  dispatch: (event: BorrowEvent) => Promise<void>;
  /** `useExecution()`'s latest result: set on every render, before any effect runs. */
  runner: () => UseExecutionResult;
  latest: RefObject<Latest>;
  /**
   * The runner's current drive, and the attempt its events and its result
   * are tagged with: the one that started it, or a later one following it.
   */
  driving: RefObject<{ attempt: number } | undefined>;
  /** The "taking longer" timer. */
  delayTimer: RefObject<ReturnType<typeof setTimeout> | undefined>;
};

export type EffectHandler<E extends BorrowEffect = BorrowEffect> = (
  effect: E,
) => Promise<void> | void;

/** A runner for each effect `type`, given the effect of that `type`. */
export type EffectHandlers = {
  [T in BorrowEffect['type']]: EffectHandler<
    Extract<BorrowEffect, { type: T }>
  >;
};
