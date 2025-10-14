import { useEffect } from 'react';

import { QuoteError } from '@/errors';
import { useMakeQuote } from '@/hooks/useMakeQuote';

import { fireEvent, moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  message?: string;
  type?: 'exact_in' | 'exact_out';
};

export const useMakeQuoteEffect = ({
  isEnabled,
  message,
  type: quoteType = 'exact_in',
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const {
    isDirectTransfer,
    isNearToIntentsSameAssetTransfer,
    isDirectNearDeposit,
  } = useComputedSnapshot();

  const isDry = !ctx.walletAddress;
  const shouldRun =
    isEnabled &&
    !isDirectTransfer &&
    !isNearToIntentsSameAssetTransfer &&
    !isDirectNearDeposit;

  const { make: makeQuote, cancel } = useMakeQuote();

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

  useEffect(() => {
    if (!shouldRun) {
      return;
    }

    // not used for depositing native Near token
    if (
      ctx.sourceToken?.assetId === NATIVE_NEAR_DUMB_ASSET_ID &&
      ctx.targetToken?.assetId === WNEAR_ASSET_ID
    ) {
      return;
    }

    const isValidState = isDry
      ? ctx.state === 'input_valid_dry'
      : (ctx.state === 'input_valid_external' && !ctx.targetToken?.isIntent) ||
        (ctx.state === 'input_valid_internal' && ctx.targetToken?.isIntent);

    void (async () => {
      try {
        // do not refetch failed quotes - persist an error instead
        if (isValidState && ctx.quoteStatus === 'idle') {
          fireEvent('quoteSetStatus', 'pending');
          const quote = await makeQuote({ message, quoteType });

          if (!quote) {
            return;
          }

          fireEvent('quoteSetStatus', 'success');
          fireEvent('quoteSet', quote);
          fireEvent('errorSet', null);

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
    })();
  }, [ctx, shouldRun, isDry, makeQuote]);
};
