import { failGuard } from '@/errors';
import type { ExecutionStep } from '@/types/execution';

/**
 * A `dry: false` create with an empty steps array is rejected with
 * `400 steps are required for non-dry executions`.
 */
export const stepsRequiredForRealCreate = (steps: ExecutionStep[]) => {
  if (steps.length === 0) {
    failGuard('STEPS_REQUIRED', 'dry: false requires a non-empty steps array');
  }
};
