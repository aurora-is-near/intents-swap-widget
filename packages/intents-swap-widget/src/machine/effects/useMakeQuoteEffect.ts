import { useCallback, useEffect, useRef } from 'react';

import { logger } from '../../logger';
import { isDryQuote } from '../guards/checks/isDryQuote';
import type { ListenerProps } from './types';

import { useConfig } from '@/config';
import { QuoteError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useMakeQuote } from '@/hooks/useMakeQuote';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';
import type { FetchQuoteOptions } from '@/types/quote';

export type Props = ListenerProps & {
  message?: string;
  type?: 'exact_in' | 'exact_out';
  refetchQuoteInterval?: number;
};

export const useMakeQuoteEffect = ({
  isEnabled,
  message,
  type: quoteType = 'exact_in',
  refetchQuoteInterval,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { isNativeNearDeposit } = useComputedSnapshot();
  const { apiKey, fetchQuote } = useConfig();

  const isDry = isDryQuote(ctx);

  const shouldRun =
    isEnabled &&
    !isNativeNearDeposit &&
    !ctx.areInputsValidating &&
    (!!fetchQuote || (!!apiKey && !fetchQuote));

  const { make: makeQuote, cancel: cancelQuote } = useMakeQuote();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancel = () => {
    cancelQuote();
  };

  // cancels any ongoing quote request if input becomes invalid
  useEffect(() => {
    const isValidDryInput = guardStates(ctx, ['input_valid_dry']);
    const isValidExternalInput = guardStates(ctx, ['input_valid_external']);
    const isValidInternalInput = guardStates(ctx, ['input_valid_internal']);

    if (isDry && !isValidDryInput) {
      cancel();
    } else if (!isDry && ctx.targetToken?.isIntent && !isValidInternalInput) {
      cancel();
    } else if (!isDry && !ctx.targetToken?.isIntent && !isValidExternalInput) {
      cancel();
    } else if (ctx.areInputsValidating) {
      cancel();
    }
  }, [cancel, isDry, ctx]);

  const run = useCallback(
    async (options: FetchQuoteOptions) => {
      try {
        if (!options.isRefetch) {
          fireEvent('quoteSetStatus', 'pending');
        }

        const quote = await makeQuote({ message, quoteType, options });

        if (!quote) {
          return;
        }

        fireEvent('quoteSetStatus', 'success');
        fireEvent('quoteSet', quote);

        if (!isDry && ctx.error?.code !== 'SOURCE_BALANCE_INSUFFICIENT') {
          // should persist SOURCE_BALANCE_INSUFFICIENT error, if it was set during dry run
          fireEvent('errorSet', null);
        }

        if (quote.type !== 'QUOTE_DEPOSIT_ANY_AMOUNT') {
          fireEvent('tokenSetAmount', {
            variant: 'target',
            amount: quote.amountOut,
          });
        }

        if (ctx.state === 'input_valid_dry') {
          moveTo('quote_success_dry');

          return;
        }

        if (ctx.targetToken?.isIntent) {
          moveTo('quote_success_internal');
        } else {
          moveTo('quote_success_external');
        }
      } catch (err) {
        if (err instanceof QuoteError) {
          if (err.data.code === 'QUOTE_INVALID_INITIAL') {
            fireEvent('quoteSetStatus', 'idle');
            fireEvent('quoteSet', undefined);
            fireEvent('errorSet', null);

            return;
          }

          fireEvent('quoteSetStatus', 'error');
          fireEvent('quoteSet', undefined);
          fireEvent('errorSet', err.data);

          validateInputAndMoveTo(ctx);

          return;
        }

        // unhandled error
        logger.error('Unhandled error in useMakeQuoteEffect:', err);
        fireEvent('quoteSetStatus', 'error');
        fireEvent('quoteSet', undefined);
        fireEvent('errorSet', {
          code: 'QUOTE_FAILED',
          meta: { message: 'Unknown error' },
        });
      }
    },
    [ctx, isDry, makeQuote, message, quoteType, shouldRun],
  );

  useEffect(() => {
    if (!shouldRun) {
      return;
    }

    const isValidState = isDry
      ? ctx.state === 'input_valid_dry'
      : (ctx.state === 'input_valid_external' && !ctx.targetToken?.isIntent) ||
        (ctx.state === 'input_valid_internal' && ctx.targetToken?.isIntent);

    if (!isValidState) {
      return;
    }

    // do not refetch failed quotes - persist an error instead
    if (ctx.quoteStatus === 'error') {
      return;
    }

    void run({ isRefetch: false });
  }, [shouldRun, run, cancel, ctx.sourceToken, ctx.targetToken]);

  // Refetch if an interval is set and a quote was successful
  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (
      (ctx.state !== 'quote_success_internal' &&
        ctx.state !== 'quote_success_external') ||
      !refetchQuoteInterval
    ) {
      return cleanup;
    }

    intervalRef.current = setInterval(async () => {
      await run({ isRefetch: true });
    }, refetchQuoteInterval);

    return cleanup;
  }, [shouldRun, run, cancel, ctx.state]);
};
