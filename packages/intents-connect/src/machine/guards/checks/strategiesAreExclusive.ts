import { failGuard } from '@/errors';
import type { FeeStrategy, Step } from '@/types/execution';
import { stepsUsePlaceholder } from '@/machine/guards/checks/stepsUsePlaceholder';

/**
 * `{MIN_AMOUNT_OUT}` exists to collapse the three-round protocol into one call,
 * so the two strategies are alternatives. A `threeRound` flow computes literal
 * amounts, and leaking the placeholder into one of its steps would leave two
 * steps operating on different amounts.
 *
 * The converse is deliberately NOT asserted. Under the placeholder strategy the
 * runner passes `{MIN_AMOUNT_OUT}` as `ctx.amount`, so the placeholder appears
 * exactly when the recipe interpolates the amount. A recipe that legitimately
 * never does — a bare `claim()`, or steps with intentionally fixed amounts — is
 * valid, and rejecting it here would block it for no reason. The runner logs a
 * warning via `stepsUsePlaceholder` instead.
 */
export const strategiesAreExclusive = (
  strategy: FeeStrategy,
  steps: Step[],
) => {
  if (strategy.kind === 'threeRound' && stepsUsePlaceholder(steps)) {
    failGuard(
      'STRATEGY_CONFLICT',
      'threeRound steps must carry literal amounts, not {MIN_AMOUNT_OUT}',
    );
  }
};
