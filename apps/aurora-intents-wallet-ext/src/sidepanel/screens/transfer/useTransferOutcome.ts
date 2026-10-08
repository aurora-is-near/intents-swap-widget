import { useEffect, useRef, useState } from 'react';

import {
  fireEvent,
  useOneClickExecutionStatus,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { TransferResult } from '@aurora-is-near/intents-swap-widget';

type Outcome = {
  transfer: TransferResult;
  /** 1Click's deposit address for this transfer, to follow it to the end. */
  depositAddress: string | undefined;
  depositMemo: string | undefined;
  startedAt: number;
};

/**
 * What the screen shows around the widget's submit:
 * - `form`, then `pending` while the wallet or passkey signs and the deposit
 *   is made (a declined signature goes back to the form: status idle);
 * - `settling` once the deposit reached 1Click and the swap is being filled;
 * - `success`, or `refunded` when 1Click couldn't fill it, or `error` when the
 *   transfer itself failed.
 */
export const useTransferOutcome = () => {
  const { ctx } = useUnsafeSnapshot();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const { status } = ctx.transferStatus;

  useEffect(() => {
    if (status === 'pending') {
      startedAt.current ??= Date.now();
    } else if (status === 'idle') {
      startedAt.current = null;
    }
  }, [status]);

  // The transfer's "success" is the deposit to 1Click, from a wallet or by an
  // intent. Direct NEAR transfers don't go through 1Click at all.
  const isOneClick = !!outcome?.transfer.isOneClickDeposit;
  const execution = useOneClickExecutionStatus({
    depositAddress: isOneClick ? outcome.depositAddress : undefined,
    depositMemo: outcome?.depositMemo,
  });

  const executionStatus = isOneClick
    ? String(execution.data?.status ?? 'PENDING')
    : 'SUCCESS';

  const isFinal =
    !!outcome && ['SUCCESS', 'FAILED', 'REFUNDED'].includes(executionStatus);

  useEffect(() => {
    if (isFinal && finishedAt === null) {
      setFinishedAt(Date.now());
    }
  }, [isFinal, finishedAt]);

  const onSuccess = (transfer: TransferResult) => {
    const quote = ctx.quote && !ctx.quote.dry ? ctx.quote : null;

    setFinishedAt(null);
    setOutcome({
      transfer,
      depositAddress: quote?.depositAddress,
      depositMemo:
        quote && 'depositMemo' in quote ? quote.depositMemo : undefined,
      startedAt: startedAt.current ?? Date.now(),
    });
  };

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
      switch (executionStatus) {
        case 'SUCCESS':
          return 'success' as const;
        case 'FAILED':
        case 'REFUNDED':
          return 'refunded' as const;
        default:
          return 'settling' as const;
      }
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

  const details =
    execution.data && 'swapDetails' in execution.data
      ? execution.data.swapDetails
      : undefined;

  return {
    view,
    transfer: outcome?.transfer,
    /** What 1Click actually delivered, once it's done. */
    amountOutFormatted: details?.amountOutFormatted,
    seconds:
      outcome && finishedAt
        ? Math.round((finishedAt - outcome.startedAt) / 1000)
        : null,
    isSigned:
      view === 'settling' ||
      (status === 'pending' && ctx.transferStatus.reason === 'PROCESSING'),
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
