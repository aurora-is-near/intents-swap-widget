import { IN_FLIGHT_STATUSES } from '@aurora-is-near/intents-connect';
import type { Execution } from '@aurora-is-near/intents-connect';

import { isStepsPreview } from '../../flow/guards';
import { progressOf } from '../../stores/executionProgress';
import { diagnoseBorrowStep } from '../../utils/diagnoseBorrowStep';
import { quoteBorrow, quoteBorrowSteps } from '../../utils/quote';
import type { Quoted } from '../../utils/quote';
import type { EffectContext, EffectHandlers } from './context';

/**
 * What a borrow is checked and priced with: the wallet's open executions,
 * the dry runs, and the market read that explains a failed borrow step.
 */
export const quoteEffects = ({
  dispatch,
  runner,
  latest,
}: EffectContext): Pick<
  EffectHandlers,
  'listOpen' | 'quote' | 'quoteSteps' | 'diagnose'
> => {
  /** The wallet's first open execution; unread (an error) counts as none. */
  const openExecution = async (): Promise<Execution | undefined> => {
    const { wallet: owner, api } = latest.current;

    if (owner === undefined) {
      return undefined;
    }

    try {
      const [open] = await api.listExecutions(owner, {
        status: IN_FLIGHT_STATUSES,
      });

      return open;
    } catch {
      return undefined;
    }
  };

  /** `QUOTED` or `QUOTE_FAILED`, once a dry run for `attempt` settles. */
  const settleQuote = (attempt: number, quoting: Promise<Quoted>) =>
    quoting.then(
      (quoted) => dispatch({ type: 'QUOTED', attempt, ...quoted }),
      (error: unknown) => dispatch({ type: 'QUOTE_FAILED', attempt, error }),
    );

  return {
    listOpen: (effect) =>
      openExecution().then((open) =>
        dispatch({
          type: 'OPEN_LISTED',
          attempt: effect.attempt,
          open,
          known: open ? progressOf(latest.current.wallet, open.id) : undefined,
        }),
      ),

    quote: (effect) =>
      settleQuote(
        effect.attempt,
        quoteBorrow(effect.input, (plan) => runner().preview(plan)),
      ),

    quoteSteps: (effect) =>
      settleQuote(
        effect.attempt,
        quoteBorrowSteps(effect.input, effect.intermediary, (plan) =>
          runner().previewSteps(plan),
        ),
      ),

    diagnose: (effect) => {
      const { input, borrowed } = effect;

      return input.adapter
        .getMarketSnapshot(input.market)
        .then((snapshot) =>
          diagnoseBorrowStep({
            snapshot,
            collateral: input.collateral,
            borrow: input.borrow,
            // What was supplied: the steps-only `spendable`, else the
            // bridge's minimum received.
            collateralAmount: BigInt(
              isStepsPreview(borrowed)
                ? borrowed.steps.spendable
                : borrowed.preview.execution.quote.minAmountOut,
            ),
            borrowAmount: borrowed.borrowAmount,
          }),
        )
        .then(
          (borrowStep) =>
            borrowStep
              ? dispatch({
                  type: 'DIAGNOSED',
                  attempt: effect.attempt,
                  cause: effect.cause,
                  borrowStep,
                })
              : undefined,
          // Unread: the failure stays unexplained.
          () => undefined,
        );
    },
  };
};
