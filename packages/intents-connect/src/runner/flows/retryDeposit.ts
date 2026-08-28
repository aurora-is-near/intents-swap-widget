import type { Execution } from '@/types/execution';
import type { RunnerCtx } from '@/runner/ctx';
import { awaitDeposit } from '@/runner/stages/deposit';
import { fail } from '@/runner/stages/fail';
import { settle } from '@/runner/stages/settle';

/**
 * Retries the deposit transfer after the wallet prompt was rejected or
 * failed (`DepositTransferError`). The execution is still valid and signed
 * server-side; nothing before the transfer is repeated.
 */
export const retryDeposit = async (ctx: RunnerCtx): Promise<Execution> => {
  const { machine, state, patch } = ctx;
  const { execution } = machine.context;
  const { activePlan } = state;

  if (!activePlan || !execution) {
    throw new Error(
      'nothing to retry — retryDeposit() applies only after run() stopped at the deposit transfer',
    );
  }

  if (machine.current !== 'awaiting-deposit') {
    throw new Error(
      `retryDeposit() requires the awaiting-deposit phase (current: ${machine.current})`,
    );
  }

  // The failure being retried is superseded the moment the user retries —
  // a UI keys its error line and recovery controls off `context.error`, and
  // keeping it makes a running retry look still-failed. run() and resume()
  // get this for free from prepareForNewFlow(); retry keeps the machine
  // state by design, so the error is cleared explicitly.
  patch({ error: undefined });

  try {
    await awaitDeposit(ctx, activePlan, execution);

    return await settle(ctx, execution.id);
  } catch (error) {
    return fail(ctx, error);
  }
};
