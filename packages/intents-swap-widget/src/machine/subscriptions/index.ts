import { isQuoteIdle } from './checkers/isQuoteIdle';
import { isInputChanged } from './checkers/isInputChanged';
import { isErrorChanged } from './checkers/isErrorChanged';
import { isOnlyErrorChanged } from './checkers/isOnlyErrorChanged';
import { isValidInitialState } from './checkers/isValidInitialState';
import { isWalletDisconnected } from './checkers/isWalletDisconnected';
import { isSendAddressForbidden } from './checkers/isSendAddressForbidden';
import { isSendAddressAsConnected } from './checkers/isSendAddressAsConnected';
import { isAmountChangedFromQuote } from './checkers/isAmountChangedFromQuote';
import type { ContextChange } from '@/machine/context';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';
import { machine, moveTo } from '@/machine';
import { fireEvent } from '@/machine/events/utils/fireEvent';
import { logger } from '@/logger';

type Args = {
  debug: boolean;
};

export const registerGlobalContextSubscription = ({ debug }: Args) => {
  machine.onContextChange((ctx, _changes) => {
    const changes = _changes as ContextChange[];

    if (debug) {
      logger.debug('[WIDGET] Context changed', changes);
    }

    if (debug && ctx.error && isErrorChanged(changes)) {
      logger.debug(`[WIDGET] Error set to ${ctx.error.code}`);
    }

    // do not validate on just error change
    if (isOnlyErrorChanged(changes)) {
      return;
    }

    // do not trigger validation if amount changed from a quote
    if (isAmountChangedFromQuote(ctx, changes, debug)) {
      return;
    }

    // if wallet was disconnected - clean the state
    if (isWalletDisconnected(ctx, changes)) {
      fireEvent('reset', {
        clearWalletAddress: true,
        keepSelectedTokens: true,
      });
      moveTo('initial_dry');

      return;
    }

    // revalidate inputs on any of the input changed
    const { isChanged, isDry } = isInputChanged(ctx, changes);

    if (!isChanged) {
      return;
    }

    if (isValidInitialState(ctx)) {
      const nextState = isDry ? 'initial_dry' : 'initial_wallet';

      moveTo(nextState, {
        onMoved: () => {
          if (debug) {
            logger.debug(
              `[WIDGET] Inputs changed. State moved to ${nextState}`,
            );
          }
        },
      });
    }

    // reset quote on any input change
    if (!isQuoteIdle(ctx)) {
      ctx.quote = undefined;
      ctx.quoteStatus = 'idle';
      ctx.transferStatus = { status: 'idle' };
    }

    // reset send to address if transfer to intents
    if (isSendAddressForbidden(ctx)) {
      ctx.sendAddress = undefined;
    }

    // reset send to address if transfer is possible to own wallet
    if (isSendAddressAsConnected(ctx, changes)) {
      ctx.sendAddress = ctx.walletAddress;
    }

    // validate inputs on change
    validateInputAndMoveTo(ctx);
  });
};

export const registerGlobalStateSubscription = ({ debug }: Args) => {
  machine.onTransition((fromState, toState) => {
    if (debug) {
      logger.debug(`===> [WIDGET] State moved from ${fromState} to ${toState}`);
    }
  });
};
