import { failGuard } from '@/errors';
import { createExecutionMachine, moveTo } from '@/machine/machine';
import type { RunnerCtx } from '@/runner/ctx';

/**
 * Deep-freezes a preview snapshot so a caller cannot edit the prepared steps
 * it later commits.
 */
export const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }

  return value;
};

/**
 * A planning context bound to a throw-away machine: previews reuse the
 * stages, but must never move the live machine or emit runner events.
 *
 * The address is pinned at creation: a wallet switch mid-preview fails the
 * preview instead of silently mixing two accounts' steps.
 */
export const createIsolatedCtx = (ctx: RunnerCtx): RunnerCtx => {
  ctx.throwIfDisposed();
  const address = ctx.requireAddress();
  const machine = createExecutionMachine();

  const requireAddress = () => {
    ctx.throwIfDisposed();

    if (ctx.requireAddress() !== address) {
      failGuard(
        'WALLET_NOT_CONNECTED',
        'Wallet changed while preparing the preview',
      );
    }

    return address;
  };

  return {
    ...ctx,
    machine,
    requireAddress,
    patch: (values) => {
      Object.assign(machine.context, values);
    },
    emit: () => undefined,
    to: (phase) => moveTo(machine, phase, { logger: ctx.logger }),
  };
};
