import { Button } from '@aurora-is-near/intents-swap-widget';
import { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import {
  CANCEL_COPY,
  CANCELLING_COPY,
  DEPOSIT_INTO,
  PHASE_COPIES,
  RESUME_DEPOSIT_COPY,
  RETRY_DEPOSIT_COPY,
} from '../constants/copies';
import { useIntentsConnectDeposit } from '../hooks/useIntentsConnectDeposit';

type InflightDepositState = Omit<
  Extract<ReturnType<typeof useIntentsConnectDeposit>, { state: 'IN_FLIGHT' }>,
  'deposit' | 'isBusy'
>;

type NotInflightDeposit = Exclude<
  ReturnType<typeof useIntentsConnectDeposit>,
  { state: 'IN_FLIGHT' }
>;

const CancelButton = ({
  exec,
  executionId,
}: {
  exec: UseExecutionResult;
  /**
   * The execution to release. Omitted where the state carries no id of its
   * own (waiting for a deposit): the runner then cancels the execution it is
   * currently driving.
   */
  executionId?: string;
}) => {
  return (
    <Button
      size="lg"
      variant="outlined"
      className="w-full"
      state={exec.isCancelling ? 'loading' : 'default'}
      onClick={() => {
        exec.cancel(executionId).catch(() => undefined);
      }}>
      {exec.isCancelling ? CANCELLING_COPY : CANCEL_COPY}
    </Button>
  );
};

const ResumeButton = ({
  exec,
  depositState,
}: {
  exec: UseExecutionResult;
  depositState: InflightDepositState;
}) => {
  return (
    <Button
      fluid
      size="lg"
      className="w-full"
      variant="primary"
      onClick={() => {
        exec.resume(depositState.id).catch(() => undefined);
      }}>
      {RESUME_DEPOSIT_COPY}
    </Button>
  );
};

const DepositButton = ({
  exec,
  depositState,
  canDeposit,
}: {
  canDeposit: boolean;
  exec: UseExecutionResult;
  depositState: NotInflightDeposit;
}) => {
  let buttonState: 'loading' | 'default' | 'disabled' = 'disabled';

  if (depositState.isBusy && depositState.state !== 'FAILED') {
    buttonState = 'loading';
  } else if (canDeposit || depositState.state === 'FAILED') {
    buttonState = 'default';
  }

  return (
    <Button
      fluid
      size="lg"
      className="w-full"
      variant="primary"
      state={buttonState}
      onClick={() => {
        if (depositState.state === 'FAILED') {
          exec.retryDeposit().catch(() => undefined);
        } else {
          void depositState.deposit();
        }
      }}>
      {(() => {
        if (depositState.state === 'FAILED') {
          return RETRY_DEPOSIT_COPY;
        }

        // No `isCancelling` branch: while a delete signature is pending the
        // layout collapses to the Cancel button alone, so this one is not
        // rendered at all.
        return depositState.isBusy ? PHASE_COPIES[exec.phase] : DEPOSIT_INTO;
      })()}
    </Button>
  );
};

export const SubmitButton = {
  Cancel: CancelButton,
  Resume: ResumeButton,
  Deposit: DepositButton,
};
