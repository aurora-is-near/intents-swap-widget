import { assertNever } from '@/utils/assertNever';

import type { BorrowEvent } from '../../flow/events';
import type { DriveHow } from '../../flow/state';
import type { EffectContext, EffectHandlers } from './context';

/** The runner's work: driving it, following an execution, cancelling one. */
export const runnerEffects = ({
  dispatch,
  runner,
  driving: drivingRef,
}: EffectContext): Pick<EffectHandlers, 'drive' | 'follow' | 'cancel'> => {
  const startDrive = (how: DriveHow): Promise<{ id: string }> => {
    const current = runner();

    switch (how.kind) {
      case 'run':
        return current.run(how.plan);
      case 'runSteps':
        return current.runSteps(how.plan);
      case 'resume':
        return current.resume(how.executionId);
      case 'retryDeposit':
        return current.retryDeposit();
      default:
        return assertNever(how, 'drive');
    }
  };

  /**
   * Drives the runner for `attempt`: its events, then its result, go to the
   * machine, under the attempt following the drive by then (`follow` may
   * hand it to a later one).
   */
  const drive = async (attempt: number, how: DriveHow) => {
    const driving = { attempt };

    drivingRef.current = driving;

    let outcome: BorrowEvent;

    try {
      const { id } = await startDrive(how);

      outcome = { type: 'RUN_DONE', attempt: driving.attempt, id };
    } catch (error) {
      outcome = { type: 'RUN_FAILED', attempt: driving.attempt, error };
    }

    if (drivingRef.current === driving) {
      drivingRef.current = undefined;
    }

    await dispatch(outcome);
  };

  return {
    drive: (effect) => drive(effect.attempt, effect.how),

    follow: (effect) => {
      const current = runner();

      // This runner still drives it (the dialog was closed while it ran):
      // its events, and the result of the drive under way, now go to this
      // attempt; a second resume would be refused.
      if (current.isBusy && current.executionId === effect.executionId) {
        if (drivingRef.current) {
          drivingRef.current.attempt = effect.attempt;
        } else {
          drivingRef.current = { attempt: effect.attempt };
        }
      } else {
        void drive(effect.attempt, {
          kind: 'resume',
          executionId: effect.executionId,
        });
      }
    },

    cancel: (effect) =>
      runner()
        .cancel(effect.executionId)
        .then(
          () =>
            dispatch({
              type: 'CANCELLED',
              attempt: effect.attempt,
              executionId: effect.executionId,
            }),
          (error: unknown) =>
            dispatch({
              type: 'CANCEL_FAILED',
              attempt: effect.attempt,
              executionId: effect.executionId,
              error,
            }),
        ),
  };
};
