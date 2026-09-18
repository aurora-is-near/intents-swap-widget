import { useEffect, useRef, useState } from 'react';
import {
  GuardError,
  IntentsConnectApiError,
  IntentsConnectError,
} from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import type { SolanaSpendQuote } from '../spend';

/** Turns SDK guard codes into copy a balance-card user can act on. */
export const explainSpendError = (error: unknown): unknown => {
  if (error instanceof GuardError && error.code === 'FEE_NOT_ESTIMATED') {
    return new IntentsConnectError(
      'Connect could not estimate the fee for this action. Make sure the Connect account holds the asset, then try again.',
      { cause: error },
    );
  }

  if (error instanceof GuardError && error.code === 'FEE_EXCEEDS_AMOUNT') {
    return new IntentsConnectError(
      'The Connect network fee is larger than this balance can cover.',
      { cause: error },
    );
  }

  if (error instanceof IntentsConnectApiError && error.status === 503) {
    return new IntentsConnectError(
      'Connect has no free Solana nonce account right now; try again in a moment.',
      { cause: error },
    );
  }

  return error;
};

/**
 * Review-then-confirm for a steps-only spend (sell or withdraw) from the
 * balance card, one row at a time.
 *
 * `execute()` on a fresh key previews and shows the figures. Called again
 * while a fresh review is on screen, it previews once more and, unless the
 * guaranteed USDC fell, commits the SDK's prepared steps. A changed `inputKey`
 * (row, balance, recipient, wallet) drops the review.
 */
export const useSolanaSpend = ({
  exec,
  inputKey,
}: {
  exec: Pick<UseExecutionResult, 'runSteps'>;
  inputKey: string;
}) => {
  const [review, setReview] = useState<{
    key: string;
    quote: SolanaSpendQuote;
    moved: boolean;
    committed: boolean;
  }>();

  const currentKey = useRef(inputKey);
  const request = useRef(0);
  const mounted = useRef(true);

  if (currentKey.current !== inputKey) {
    currentKey.current = inputKey;
    request.current += 1;
  }

  useEffect(() => setReview(undefined), [inputKey]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, []);

  const current = review?.key === inputKey ? review : undefined;

  useEffect(() => {
    if (!current || current.committed) {
      return;
    }

    const timer = setTimeout(
      () => setReview((value) => (value === current ? undefined : value)),
      Math.max(0, current.quote.expiresAt - Date.now()),
    );

    return () => clearTimeout(timer);
  }, [current]);

  const execute = async (preview: () => Promise<SolanaSpendQuote>) => {
    const key = inputKey;

    request.current += 1;
    const id = request.current;
    const previous =
      current && !current.committed && current.quote.expiresAt > Date.now()
        ? current.quote
        : undefined;

    const isCurrent = () =>
      mounted.current && currentKey.current === key && request.current === id;

    let quote: SolanaSpendQuote;

    try {
      quote = await preview();
    } catch (error) {
      if (isCurrent()) {
        setReview(undefined);
        throw explainSpendError(error);
      }

      return;
    }

    if (!isCurrent()) {
      return;
    }

    const moved =
      !!previous &&
      BigInt(quote.minimumReceive) < BigInt(previous.minimumReceive);

    setReview({ key, quote, moved, committed: false });

    if (!previous || moved) {
      return;
    }

    setReview({ key, quote, moved: false, committed: true });
    await exec.runSteps(quote.preview.plan).catch((error: unknown) => {
      if (isCurrent()) {
        if (error instanceof GuardError && error.code === 'QUOTE_MOVED') {
          setReview(undefined);
        }

        throw explainSpendError(error);
      }
    });
  };

  return {
    quote: current?.quote,
    quoteMoved: current?.moved ?? false,
    isCommitted: current?.committed ?? false,
    execute,
    clear: () => setReview(undefined),
  };
};
