import { useCallback, useEffect, useRef } from 'react';

import { isDryQuote } from '../guards/checks/isDryQuote';
import type { ListenerProps } from './types';
import { QuoteError } from '@/errors';
import { fireEvent, moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useMakeQuote } from '@/hooks/useMakeQuote';
import { useMakeDepositAddress } from '@/hooks/useMakeDepositAddress';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';
import { isNearAddress } from '@/utils/near/isNearAddress';
import { isNearNamedAccount } from '@/utils/near/isNearNamedAccount';
import type { FetchQuoteOptions, Quote } from '@/types/quote';

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
  const {
    isNativeNearDeposit,
    isDirectNonNearWithdrawal,
    isDirectTokenOnNearDeposit,
    isDirectNearTokenWithdrawal,
    isDirectTokenOnNearTransfer,
    isSameAssetDiffChainWithdrawal,
  } = useComputedSnapshot();

  const isDry = isDryQuote(ctx);

  const shouldRun =
    isEnabled &&
    (isSameAssetDiffChainWithdrawal ||
      ((isDirectTokenOnNearDeposit || isNativeNearDeposit) &&
        ctx.isDepositFromExternalWallet) ||
      (!isDirectNearTokenWithdrawal &&
        !isDirectNonNearWithdrawal &&
        !isDirectTokenOnNearDeposit &&
        !isDirectTokenOnNearTransfer));

  const { make: makeQuote, cancel: cancelQuote } = useMakeQuote();
  const { make: makeDepositAddress, cancel: cancelDepositAddress } =
    useMakeDepositAddress();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancel = () => {
    cancelQuote();
    cancelDepositAddress();
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
    }
  }, [cancel, isDry, ctx]);

  // Set pending immediately for NEAR named accounts (prevents button flash)
  useEffect(() => {
    if (
      !isDry &&
      ctx.targetToken?.blockchain === 'near' &&
      !ctx.targetToken?.isIntent &&
      ctx.sendAddress &&
      isNearAddress(ctx.sendAddress) &&
      isNearNamedAccount(ctx.sendAddress) &&
      ctx.quoteStatus !== 'error'
    ) {
      fireEvent('quoteSetStatus', 'pending');
      fireEvent('quoteSet', undefined);
    }
  }, [ctx.sendAddress, ctx.targetToken, isDry]);

  const run = useCallback(
    async (options: FetchQuoteOptions) => {
      try {
        let quote: Quote | undefined;

        if (
          ctx.sourceToken?.assetId === ctx.targetToken?.assetId ||
          (isNativeNearDeposit && ctx.isDepositFromExternalWallet)
        ) {
          if (isDry) {
            // since here it's not a real quote but just a deposit address generation
            // we don't want to run it for dry runs
            return;
          }

          fireEvent('quoteSetStatus', 'pending');
          quote = await makeDepositAddress();
        } else {
          // Invalid NEAR address format
          if (
            ctx.targetToken?.blockchain === 'near' &&
            !ctx.targetToken?.isIntent &&
            ctx.sendAddress &&
            !isNearAddress(ctx.sendAddress)
          ) {
            fireEvent('quoteSetStatus', 'error');
            fireEvent('errorSet', {
              code: 'NEAR_ADDRESS_INVALID',
              meta: { address: ctx.sendAddress },
            });

            return;
          }

          fireEvent('quoteSetStatus', 'pending');
          quote = await makeQuote({ message, quoteType, options });
        }

        if (!quote) {
          return;
        }

        fireEvent('quoteSetStatus', 'success');
        fireEvent('quoteSet', quote);

        if (!isDry && ctx.error?.code !== 'SOURCE_BALANCE_INSUFFICIENT') {
          // should persist SOURCE_BALANCE_INSUFFICIENT error, if it was set during dry run
          fireEvent('errorSet', null);
        }

        fireEvent('tokenSetAmount', {
          variant: 'target',
          amount: quote.amountOut,
        });

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
        fireEvent('quoteSetStatus', 'error');
        fireEvent('quoteSet', undefined);
        fireEvent('errorSet', {
          code: 'QUOTE_FAILED',
          meta: { message: 'Unknown error' },
        });
      }
    },
    [ctx, isDry, makeDepositAddress, makeQuote, message, quoteType, shouldRun],
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

    // not used for depositing native Near token without QR code
    if (isNativeNearDeposit && !ctx.isDepositFromExternalWallet) {
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
