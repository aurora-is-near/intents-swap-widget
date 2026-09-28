import { useRef, useState } from 'react';

import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { buildPolymarketPlan } from '../plan';

type Args = {
  exec: UseExecutionResult;
  token: Token | undefined;
  /** Atomic units, as the widget store keeps it. */
  amount: string;
  account: string;
  /** Read at submit time, so toggling it never affects a live execution. */
  depositViaWallet: boolean;
};

export type DepositState =
  | { state: 'IDLE' }
  /** `run()` hit this wallet's in-flight lock: resume it or cancel it. */
  | { state: 'IN_FLIGHT'; id: string }
  /** The wallet transfer failed after signing: retry it or cancel. */
  | { state: 'FAILED'; id: string; message: string };

/**
 * Starts a Polymarket deposit and maps the runner's recovery hint onto the
 * three states the form can act on.
 */
export const useDeposit = ({
  exec,
  token,
  amount,
  account,
  depositViaWallet,
}: Args) => {
  const [isDepositing, setIsDepositing] = useState(false);
  const [preparationError, setPreparationError] = useState<Error>();
  const submitting = useRef(false);

  const deposit = async () => {
    if (
      !token ||
      !isNotEmptyAmount(amount) ||
      submitting.current ||
      exec.isBusy
    ) {
      return;
    }

    submitting.current = true;
    setIsDepositing(true);
    setPreparationError(undefined);

    try {
      await exec.run(
        buildPolymarketPlan({
          token,
          amountAtomic: amount,
          depositViaWallet,
          account,
        }),
      );
    } catch (error) {
      setPreparationError(
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      submitting.current = false;
      setIsDepositing(false);
    }
  };

  let recovery: DepositState = { state: 'IDLE' };

  if (exec.recovery?.kind === 'resume-or-cancel') {
    recovery = { state: 'IN_FLIGHT', id: exec.recovery.executionId };
  } else if (exec.recovery?.kind === 'retry-transfer') {
    recovery = {
      state: 'FAILED',
      id: exec.recovery.executionId,
      message: exec.error?.message ?? 'Deposit transfer failed',
    };
  }

  return {
    ...recovery,
    isBusy: exec.isBusy || isDepositing,
    deposit,
    preparationError,
  };
};
