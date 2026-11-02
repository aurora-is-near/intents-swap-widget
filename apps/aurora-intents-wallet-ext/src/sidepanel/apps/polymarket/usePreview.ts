import { useEffect, useRef, useState } from 'react';

import type { Execution } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';

import { buildPolymarketPlan } from './plan';

const DEBOUNCE_MS = 700;

type Args = {
  exec: UseExecutionResult;
  token: Token | undefined;
  /** Atomic units. */
  amount: string;
  account: string;
  isAccountValid: boolean;
  depositViaWallet: boolean;
};

/**
 * What a deposit would deliver, from a dry create (no signature, no lock, no
 * state on the runner): the post-fee USDC that becomes pUSD, the fee and the
 * time. For display only — the deposit builds a fresh plan.
 */
export const usePreview = ({
  exec,
  token,
  amount,
  account,
  isAccountValid,
  depositViaWallet,
}: Args) => {
  const [preview, setPreview] = useState<Execution>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const sequence = useRef(0);

  const isReady = !!token && isNotEmptyAmount(amount) && isAccountValid;

  useEffect(() => {
    sequence.current += 1;
    const { current } = sequence;

    setPreview(undefined);
    setError(undefined);

    if (!isReady || exec.isBusy) {
      setIsLoading(false);

      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      exec
        .preview(
          buildPolymarketPlan({
            token,
            amountAtomic: amount,
            depositViaWallet,
            account,
          }),
        )
        .then((result) => {
          if (sequence.current === current) {
            setPreview(result.execution);
          }
        })
        .catch((reason: unknown) => {
          if (sequence.current === current) {
            setError(
              reason instanceof Error ? reason : new Error(String(reason)),
            );
          }
        })
        .finally(() => {
          if (sequence.current === current) {
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    isReady,
    token?.assetId,
    token?.blockchain,
    amount,
    account,
    depositViaWallet,
    exec.isBusy,
  ]);

  return { preview, isLoading, error };
};
