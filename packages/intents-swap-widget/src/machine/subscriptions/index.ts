import type { ContextChange } from '@/machine/context';
import { validateInputAndMoveTo } from '@/machine/events/validateInputAndMoveTo';
import { guardStates, machine, moveTo } from '@/machine';
import { fireEvent } from '@/machine/events/utils/fireEvent';
import { logger } from '@/logger';
import { isQuoteIdle } from './checkers/isQuoteIdle';
import { isInputChanged } from './checkers/isInputChanged';
import { isErrorChanged } from './checkers/isErrorChanged';
import { isOnlyErrorChanged } from './checkers/isOnlyErrorChanged';
import { isOnlyBalanceChanged } from './checkers/isOnlyBalanceChanged';
import { isValidInitialState } from './checkers/isValidInitialState';
import { isWalletDisconnected } from './checkers/isWalletDisconnected';
import { isSendAddressForbidden } from './checkers/isSendAddressForbidden';
import { isSendAddressAsConnected } from './checkers/isSendAddressAsConnected';
import { isAmountChangedFromQuote } from './checkers/isAmountChangedFromQuote';
import { isExternalDepositAmountChange } from './checkers/isExternalDepositAmountChange';

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

    // amount is not part of an external deposit quote - keep it and its address
    if (isExternalDepositAmountChange(ctx, changes)) {
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

    // A reset after a successful transfer only touches quote and transfer keys,
    // none of which count as an input change - so on its own it would leave the
    // machine claiming `transfer_success` over a context that no longer
    // describes one, with nothing left to trigger a revalidation. Falling
    // through here winds it back through an initial state, which is the only
    // place `transfer_success` can transition to.
    const hasLeftTransferSuccess =
      machine.current === 'transfer_success' &&
      !guardStates(ctx, ['transfer_success']);

    if (!isChanged && !hasLeftTransferSuccess) {
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

    // Reset quote on any input change, unless in the `transfer_success` state
    if (
      !isQuoteIdle(ctx) &&
      !isOnlyBalanceChanged(changes) &&
      machine.current !== 'transfer_success'
    ) {
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
