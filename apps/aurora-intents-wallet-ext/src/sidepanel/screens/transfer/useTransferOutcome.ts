import { useEffect, useRef, useState } from 'react';

import {
  fireEvent,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { TransferResult } from '@aurora-is-near/intents-swap-widget';

type Outcome = { transfer: TransferResult; seconds: number };

/**
 * What the screen shows around the widget's submit: the form, the pending
 * transfer, its result, or why it failed. A declined signature goes straight
 * back to the form (the machine resets the status to idle).
 */
export const useTransferOutcome = () => {
  const { ctx } = useUnsafeSnapshot();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const startedAt = useRef<number | null>(null);
  const { status } = ctx.transferStatus;

  useEffect(() => {
    if (status === 'pending') {
      startedAt.current ??= Date.now();
    } else if (status === 'idle') {
      startedAt.current = null;
    }
  }, [status]);

  const onSuccess = (transfer: TransferResult) =>
    setOutcome({
      transfer,
      seconds: Math.round(
        (Date.now() - (startedAt.current ?? Date.now())) / 1000,
      ),
    });

  /** Back to the form with the same tokens and amount, for a fresh quote. */
  const retry = () => {
    const amount = ctx.sourceTokenAmount;

    setOutcome(null);
    fireEvent('transferSetStatus', { status: 'idle' });
    fireEvent('errorSet', null);
    fireEvent('tokenSetAmount', { variant: 'source', amount });
  };

  /** A new form with the same tokens. */
  const again = () => {
    setOutcome(null);
    fireEvent('reset', { clearWalletAddress: false, keepSelectedTokens: true });
  };

  const view = (() => {
    if (ctx.state === 'transfer_success' && outcome) {
      return 'success' as const;
    }

    switch (status) {
      case 'pending':
        return 'pending' as const;
      case 'error':
        return 'error' as const;
      default:
        return 'form' as const;
    }
  })();

  return {
    view,
    outcome,
    isSigned:
      status === 'pending' && ctx.transferStatus.reason === 'PROCESSING',
    errorMessage:
      ctx.error &&
      'meta' in ctx.error &&
      ctx.error.meta &&
      'message' in ctx.error.meta
        ? String(ctx.error.meta.message)
        : null,
    onSuccess,
    retry,
    again,
  };
};
