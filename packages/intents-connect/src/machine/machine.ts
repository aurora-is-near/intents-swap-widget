import { proxy } from 'valtio/vanilla';

import { defaultLogger, type Logger } from '@/logger';
import { type Context, createInitialContext } from '@/machine/context';
import { type Phase, PHASE_TRANSITIONS } from '@/machine/phases';

/** The valtio store a framework binding subscribes to. */
export type ExecutionMachineStore = {
  state: Phase;
  context: Context;
};

export type ExecutionMachine = {
  readonly current: Phase;
  readonly context: Context;
  getStore: () => ExecutionMachineStore;
  canMoveTo: (phase: Phase) => boolean;
  /** Refuses an illegal transition; check `current` to see whether it moved. */
  moveTo: (phase: Phase) => ExecutionMachine;
  /**
   * Returns to `idle` with a fresh context. Deliberately bypasses the
   * transition table: it is how a runner is made reusable after a terminal
   * phase, which by design has no outgoing edges.
   */
  reset: () => void;
};

/**
 * A FACTORY, deliberately — unlike the widget, which exports a module-level
 * singleton machine.
 *
 * Two reasons: several executions may be in flight in one app (deposit while a
 * previous one settles), and a module-level valtio store leaks state across
 * requests under SSR.
 *
 * Built on `valtio/vanilla` rather than `valtio-fsm`. `valtio-fsm` imports
 * valtio's ROOT entry, which re-exports `valtio/react` and therefore requires
 * `react` to be installed — so importing this "headless" package in Node or a
 * worker failed with ERR_MODULE_NOT_FOUND. `valtio/vanilla` pulls only
 * `proxy-compare`. Only five members of `valtio-fsm` were ever used, so the
 * transitions table below replaces it outright.
 */
export const createExecutionMachine = (): ExecutionMachine => {
  const store = proxy<ExecutionMachineStore>({
    state: 'idle',
    context: createInitialContext(),
  });

  const machine: ExecutionMachine = {
    get current() {
      return store.state;
    },
    get context() {
      return store.context;
    },
    getStore: () => store,
    canMoveTo: (phase) => PHASE_TRANSITIONS[store.state].includes(phase),
    moveTo: (phase) => {
      if (machine.canMoveTo(phase)) {
        store.state = phase;
      }

      return machine;
    },
    reset: () => {
      store.state = 'idle';
      store.context = createInitialContext();
    },
  };

  return machine;
};

export type MoveToOptions = {
  logger?: Logger;
  onMoved?: (phase: Phase) => void;
};

/**
 * Guarded transition. Mirrors `moveTo` in the widget's machine: an illegal
 * transition is refused and logged rather than throwing, so a stray event
 * cannot corrupt a live execution.
 *
 * Returns whether the move happened.
 */
export const moveTo = (
  machine: ExecutionMachine,
  phase: Phase,
  { logger = defaultLogger, onMoved }: MoveToOptions = {},
): boolean => {
  if (machine.current === phase) {
    return true;
  }

  if (!machine.canMoveTo(phase)) {
    logger.error(
      `invalid transition requested (from ${machine.current} to ${phase})`,
    );

    return false;
  }

  const { current, context } = machine.moveTo(phase);

  if (current !== phase) {
    return false;
  }

  context.phase = phase;
  onMoved?.(phase);

  return true;
};
