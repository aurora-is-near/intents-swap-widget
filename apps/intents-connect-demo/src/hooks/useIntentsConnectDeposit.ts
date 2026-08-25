import { useState } from 'react';

import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { ExecutionPlan } from '@aurora-is-near/intents-connect';

export type BuildPlanFn<TParams = unknown> = (args: {
  token: Token;
  amountAtomic: string;
  depositViaWallet: boolean;
}) => Promise<ExecutionPlan<TParams>> | ExecutionPlan<TParams>;

type Args<TParams = unknown> = {
  amount: string;
  token: Token | undefined;
  exec: UseExecutionResult;
  /** Read at submit time, so toggling it never affects a live execution. */
  depositViaWallet: boolean;
  buildPlan: BuildPlanFn<TParams>;
};

export const useIntentsConnectDeposit = <TParams>({
  exec,
  token,
  amount,
  depositViaWallet,
  buildPlan,
}: Args<TParams>) => {
  const [isDepositing, setIsDepositing] = useState(false);
  const isBusy = exec.isBusy || isDepositing;

  const deposit = async () => {
    if (!token || !isNotEmptyAmount(amount)) {
      return;
    }

    setIsDepositing(true);

    try {
      const plan = await buildPlan({
        token,
        amountAtomic: amount,
        depositViaWallet,
      });

      // Failures surface via exec.error / exec.recovery; the rejection
      // carries the same object.
      await exec.run(plan).catch(() => undefined);
    } finally {
      setIsDepositing(false);
    }
  };

  const commonReturn = { isBusy, deposit };

  if (exec.recovery?.kind === 'resume-or-cancel') {
    return {
      state: 'IN_FLIGHT',
      id: exec.recovery.executionId,
      message: 'Execution is in progress',
      ...commonReturn,
    } as const;
  }

  if (exec.recovery?.kind === 'retry-transfer') {
    return {
      state: 'FAILED',
      id: exec.recovery.executionId,
      message: exec.error?.message ?? 'Execution failed',
      cause: exec.recovery.cause?.message,
      ...commonReturn,
    } as const;
  }

  return {
    state: 'IDLE',
    message: 'No existing execution',
    ...commonReturn,
  } as const;
};
