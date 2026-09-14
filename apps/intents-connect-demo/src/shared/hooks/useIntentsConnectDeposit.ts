import { useRef, useState } from 'react';

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
  /** Optional quote/review interaction owned by an integration. */
  executePlan?: (plan: ExecutionPlan<TParams>) => Promise<void>;
};

export const useIntentsConnectDeposit = <TParams>({
  exec,
  token,
  amount,
  depositViaWallet,
  buildPlan,
  executePlan,
}: Args<TParams>) => {
  const [isDepositing, setIsDepositing] = useState(false);
  const [preparationError, setPreparationError] = useState<Error>();
  const submitting = useRef(false);
  const isBusy = exec.isBusy || isDepositing;

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
      const plan = await buildPlan({
        token,
        amountAtomic: amount,
        depositViaWallet,
      });

      if (executePlan) {
        await executePlan(plan);
      } else {
        await exec.run(plan);
      }
    } catch (error) {
      setPreparationError(
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      submitting.current = false;
      setIsDepositing(false);
    }
  };

  // Forwarded so the resume control can authorise the wallet transfer. A
  // cross-session resume of a DEPOSIT_PENDING execution cannot tell a
  // transfer that never ran from one already broadcast, so the SDK only
  // re-prompts when the caller says it is safe — which for this demo is
  // exactly "the user is in wallet-deposit mode and pressed Resume".
  const commonReturn = { isBusy, deposit, depositViaWallet, preparationError };

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
