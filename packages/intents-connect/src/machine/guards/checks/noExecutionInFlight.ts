import { failGuard } from '@/errors';
import type { Execution } from '@/types/execution';

/**
 * A `dry: false` create takes an in-flight lock per (intermediary, chain); a
 * second one answers 409. Checking first turns that into an actionable error
 * naming the execution to wait for or cancel.
 */
export const noExecutionInFlight = (openExecutions: Execution[]) => {
  const [open] = openExecutions;

  if (open) {
    failGuard(
      'EXECUTION_IN_FLIGHT',
      `execution ${open.id} is already in progress — resume it, cancel it, or wait for it to reach a terminal status`,
      { executionId: open.id },
    );
  }
};
