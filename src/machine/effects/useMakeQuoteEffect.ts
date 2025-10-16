import { useEffect } from 'react';

import { QuoteError } from '@/errors';
import { useMakeQuote } from '@/hooks/useMakeQuote';

import { fireEvent, moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  message?: string;
};

export const useMakeQuoteEffect = ({ isEnabled, message }: Props) => {
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

  const { make: makeQuote, cancel } = useMakeQuote({ variant: 'swap' });

  useEffect(() => {
    const isValidDryInput = guardStates(ctx, ['input_valid_dry']);
    const isValidExternalInput = guardStates(ctx, ['input_valid_external']);
    const isValidInternalInput = guardStates(ctx, ['input_valid_internal']);

    if (isDry && !isValidDryInput) {
      console.log('[DEBUG CANCEL] Cancelling quote - invalid dry input');
      cancel();
    } else if (!isDry && ctx.targetToken?.isIntent && !isValidInternalInput) {
      console.log('[DEBUG CANCEL] Cancelling quote - invalid internal input');
      cancel();
    } else if (!isDry && !ctx.targetToken?.isIntent && !isValidExternalInput) {
      console.log('[DEBUG CANCEL] Cancelling quote - invalid external input');
      cancel();
    }
    // Only re-run when state changes, not on every ctx change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancel, isDry, ctx.state, ctx.targetToken?.isIntent]);

  useEffect(() => {
    console.log('[DEBUG EFFECT] useMakeQuoteEffect triggered');
    console.log('[DEBUG EFFECT] Dependencies:', {
      'ctx.state': ctx.state,
      'ctx.quoteStatus': ctx.quoteStatus,
      'ctx.targetToken?.isIntent': ctx.targetToken?.isIntent,
      shouldRun,
      isDry,
    });
    console.log(
      '[DEBUG EFFECT] shouldRun:',
      shouldRun,
      '(isDirectTransfer:',
      isDirectTransfer,
      'isNearToIntents:',
      isNearToIntentsSameAssetTransfer,
      'isDirectNearDeposit:',
      isDirectNearDeposit,
      ')',
    );

    if (!shouldRun) {
      console.log('[DEBUG EFFECT] Skipping quote - shouldRun is false');

      return;
    }

    let cancelled = false;

    const isValidState = isDry
      ? ctx.state === 'input_valid_dry'
      : (ctx.state === 'input_valid_external' && !ctx.targetToken?.isIntent) ||
        (ctx.state === 'input_valid_internal' && ctx.targetToken?.isIntent);

    console.log(
      '[DEBUG EFFECT] isDry:',
      isDry,
      'isValidState:',
      isValidState,
      'ctx.state:',
      ctx.state,
    );
    console.log('[DEBUG EFFECT] ctx.quoteStatus:', ctx.quoteStatus);

    void (async () => {
      try {
        // do not refetch failed quotes - persist an error instead
        // IMPORTANT: Only fetch if status is idle, not pending (prevents duplicate requests)
        if (isValidState && ctx.quoteStatus === 'idle') {
          console.log('[DEBUG EFFECT] Triggering quote fetch...');
          fireEvent('quoteSetStatus', 'pending');
          const quote = await makeQuote({ message });

          if (cancelled || !quote) {
            console.log('[DEBUG EFFECT] Quote cancelled or null');

            return;
          }

          console.log('[DEBUG EFFECT] Quote received successfully:', quote);
          fireEvent('quoteSetStatus', 'success');
          fireEvent('quoteSet', quote);
          fireEvent('errorSet', null);

          fireEvent('tokenSetAmount', {
            variant: 'target',
            amount: quote.amountOut,
          });

          if (ctx.state === 'input_valid_dry') {
            console.log('[DEBUG EFFECT] Moving to quote_success_dry');
            moveTo('quote_success_dry');

            return;
          }

          if (ctx.targetToken?.isIntent) {
            console.log('[DEBUG EFFECT] Moving to quote_success_internal');
            moveTo('quote_success_internal');
          } else {
            console.log('[DEBUG EFFECT] Moving to quote_success_external');
            moveTo('quote_success_external');
          }
        }
      } catch (err) {
        console.error('');
        console.error('╔═══════════════════════════════════════════════════╗');
        console.error('║  🔥 EFFECT CAUGHT QUOTE ERROR                     ║');
        console.error('╚═══════════════════════════════════════════════════╝');
        console.error('[EFFECT ERROR] Error object:', err);
        console.error('[EFFECT ERROR] Error type:', (err as any)?.constructor?.name);
        console.error('[EFFECT ERROR] Error message:', (err as any)?.message);

        if (cancelled) {
          console.error('[EFFECT ERROR] Request was cancelled, ignoring error');

          return;
        }

        if (err instanceof QuoteError) {
          console.error('[EFFECT ERROR] ⚠️ This is a QuoteError');
          console.error('[EFFECT ERROR] QuoteError code:', err.data.code);
          console.error('[EFFECT ERROR] QuoteError meta:', (err.data as any).meta);
          console.error('[EFFECT ERROR] Full QuoteError data:', err.data);

          if (err.data.code === 'QUOTE_INVALID_INITIAL') {
            console.error('[EFFECT ERROR] Resetting quote to idle state');
            fireEvent('quoteSetStatus', 'idle');
            fireEvent('quoteSet', undefined);
            fireEvent('errorSet', null);

            return;
          }

          console.error('[EFFECT ERROR] Setting quote status to error');
          fireEvent('quoteSetStatus', 'error');
          fireEvent('quoteSet', undefined);
          fireEvent('errorSet', err.data);

          validateInputAndMoveTo(ctx);
          console.error('╚═══════════════════════════════════════════════════╝');

          return;
        }

        // unhandled error
        console.error('[EFFECT ERROR] ❌ Unhandled error type!');
        console.error('[EFFECT ERROR] Setting generic QUOTE_FAILED error');
        fireEvent('quoteSetStatus', 'error');
        fireEvent('quoteSet', undefined);
        fireEvent('errorSet', {
          code: 'QUOTE_FAILED',
          meta: { message: 'Unknown error' },
        });
        console.error('╚═══════════════════════════════════════════════════╝');
        console.error('');
      }
    })();

    // Cleanup function to mark as cancelled when effect unmounts
    return () => {
      cancelled = true;
      console.log('[DEBUG EFFECT] Effect cleanup - marking as cancelled');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ctx.state,
    ctx.sourceToken?.assetId,
    ctx.targetToken?.assetId,
    ctx.sourceTokenAmount,
    ctx.targetToken?.isIntent,
    shouldRun,
    isDry,
    message,
  ]);
};
