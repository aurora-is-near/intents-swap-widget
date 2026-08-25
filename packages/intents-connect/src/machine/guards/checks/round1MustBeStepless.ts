import { failGuard } from '@/errors';
import type { Step } from '@/types/execution';

/**
 * Round 1 of the three-round flow must send no steps.
 *
 * Gas estimation only runs when `steps` is non-empty, so an empty array is what
 * yields a quote with no fee deducted. It must therefore also be `dry: true`.
 */
export const round1MustBeStepless = (steps: Step[]) => {
  if (steps.length > 0) {
    failGuard(
      'ROUND1_MUST_BE_STEPLESS',
      'three-round flow: round 1 must send steps: []',
    );
  }
};
