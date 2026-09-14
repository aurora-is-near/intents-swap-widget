import { useEffect, useRef, useState } from 'react';
import {
  GuardError,
  IntentsConnectApiError,
  IntentsConnectError,
} from '@aurora-is-near/intents-connect';
import type {
  ExecutionPlan,
  IntentsConnectApi,
} from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { previewSolanaBuy } from '../plan';
import type { SolanaBuyParams, SolanaBuyQuote } from '../plan';

const isNoQuote = (error: unknown) =>
  error instanceof IntentsConnectApiError && /\bNO_QUOTE\b/.test(error.message);

const explainQuoteError = (error: unknown) =>
  isNoQuote(error)
    ? new IntentsConnectError(
        '1Click could not quote the bridge to Solana USDC for this amount. Get a new quote or try another source asset or amount. (NO_QUOTE)',
        { cause: error },
      )
    : error;

export const useSolanaBuy = ({
  api,
  exec,
  inputKey,
}: {
  api: IntentsConnectApi;
  exec: Pick<UseExecutionResult, 'preview' | 'run'>;
  inputKey: string;
}) => {
  const [review, setReview] = useState<{
    key: string;
    quote: SolanaBuyQuote;
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

  const executePlan = async (plan: ExecutionPlan<SolanaBuyParams>) => {
    const key = inputKey;

    request.current += 1;
    const id = request.current;
    const previous =
      current && !current.committed && current.quote.expiresAt > Date.now()
        ? current.quote
        : undefined;

    const isCurrent = () =>
      mounted.current && currentKey.current === key && request.current === id;

    let quote: SolanaBuyQuote;

    try {
      quote = await previewSolanaBuy(api, exec, plan);
    } catch (error) {
      if (isCurrent()) {
        if (isNoQuote(error)) {
          setReview(undefined);
        }

        throw explainQuoteError(error);
      }

      return;
    }

    if (!isCurrent()) {
      return;
    }

    const moved =
      !!previous &&
      BigInt(quote.minimumOutput) < BigInt(previous.minimumOutput);

    setReview({ key, quote, moved, committed: false });

    if (!previous || moved) {
      return;
    }

    setReview({ key, quote, moved: false, committed: true });
    await exec.run(quote.preview.plan).catch((error: unknown) => {
      if (isCurrent()) {
        if (
          isNoQuote(error) ||
          (error instanceof GuardError && error.code === 'QUOTE_MOVED')
        ) {
          setReview(undefined);
        }

        throw explainQuoteError(error);
      }
    });
  };

  return {
    quote: current?.quote,
    quoteMoved: current?.moved ?? false,
    isCommitted: current?.committed ?? false,
    executePlan,
  };
};
