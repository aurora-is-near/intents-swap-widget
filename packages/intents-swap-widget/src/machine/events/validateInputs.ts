import { fireEvent } from './utils/fireEvent';
import { checkNearAccountExists } from '@/utils/near/checkNearAccountExists';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { isValidBigint } from '@/utils/checkers/isValidBigint';
import { isNearAddress } from '@/utils/chains/isNearAddress';

import { moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { isBalanceSufficient } from '@/machine/guards/checks/isBalanceSufficient';
import {
  isAsyncSendAddressValidationError,
  isQuoteError,
  isTransferError,
} from '@/machine/errors';
import type { Context } from '@/machine/context';
import type {
  InitialDryStateError,
  InitialExternalStateError,
  InitialInternalStateError,
} from '@/machine/errors';

const setAsyncError = (err: InitialExternalStateError) => {
  fireEvent('errorSet', err);
  fireEvent('quoteSet', undefined);
  fireEvent('quoteSetStatus', 'idle');
  fireEvent('transferSetStatus', { status: 'idle' });
};

const asyncValidateSendAddress = async (ctx: Context) => {
  if (!ctx.sendAddress) {
    return;
  }

  let exists: boolean = false;

  try {
    fireEvent('setInputsValidating', true);
    exists = await checkNearAccountExists(ctx.sendAddress);
  } catch (e) {
    setAsyncError({
      code: 'SEND_ADDRESS_IS_NOT_VERIFIED',
      meta: { address: ctx.sendAddress, chain: 'near' },
    });

    fireEvent('setInputsValidating', false);
    moveTo('initial_wallet');

    return;
  }

  fireEvent('setInputsValidating', false);

  if (!exists) {
    setAsyncError({
      code: 'SEND_ADDRESS_IS_NOT_FOUND',
      meta: { address: ctx.sendAddress, chain: 'near' },
    });

    moveTo('initial_wallet');

    return;
  }

  if (!ctx.error) {
    moveTo('input_valid_external');
  } else if (isAsyncSendAddressValidationError(ctx.error)) {
    fireEvent('errorSet', null);
    moveTo('input_valid_external');
  }
};

export const validateDryInputs = (ctx: Context): boolean | undefined => {
  const isValidInitialState = guardStates(ctx, ['initial_dry']);
  const isValidInputsState = guardStates(ctx, ['input_valid_dry']);

  if (!isValidInitialState && !isValidInputsState) {
    return undefined;
  }

  let err: InitialDryStateError | undefined;

  if (isValidInitialState) {
    if (!ctx.sourceToken) {
      err = { code: 'SOURCE_TOKEN_IS_EMPTY' };
    } else if (!ctx.targetToken) {
      err = { code: 'TARGET_TOKEN_IS_EMPTY' };
    } else if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
      err = { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' };
    } else if (ctx.walletAddress && !isBalanceSufficient(ctx)) {
      err = { code: 'SOURCE_BALANCE_INSUFFICIENT' };
    }
  }

  if (!isValidInputsState && err) {
    fireEvent('errorSet', err);
  } else if (
    ctx.error &&
    !isQuoteError(ctx.error) &&
    !isTransferError(ctx.error)
  ) {
    fireEvent('errorSet', null);
  }

  if (isValidInputsState && err?.code === 'SOURCE_BALANCE_INSUFFICIENT') {
    // should be able to fetch dry quote, when insufficient balance
    fireEvent('errorSet', err);
  }

  return isValidInputsState;
};

export const validateExternalInputs = (ctx: Context): boolean | undefined => {
  const isValidInitialState = guardStates(ctx, ['initial_wallet']);
  const isValidInputsState = guardStates(ctx, ['input_valid_external']);

  if (!isValidInitialState && !isValidInputsState) {
    return undefined;
  }

  const sourceBalance = ctx.sourceTokenBalance;
  let err: InitialExternalStateError | undefined;

  if (isValidInitialState) {
    if (!ctx.sourceToken) {
      err = { code: 'SOURCE_TOKEN_IS_EMPTY' };
    } else if (!ctx.targetToken) {
      err = { code: 'TARGET_TOKEN_IS_EMPTY' };
    } else if (ctx.targetToken.isIntent) {
      err = { code: 'SOURCE_TOKEN_IS_INTENT' };
    } else if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
      err = { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' };
    } else if (!ctx.sendAddress) {
      err = { code: 'SEND_ADDRESS_IS_EMPTY' };
    } else if (ctx.targetToken.blockchain === 'near') {
      if (!isNearAddress(ctx.sendAddress)) {
        err = {
          code: 'SEND_ADDRESS_IS_INVALID',
          meta: { address: ctx.sendAddress, chain: 'near' },
        };
      } else {
        void asyncValidateSendAddress(ctx);
      }
    } else if (!ctx.isDepositFromExternalWallet) {
      if (!sourceBalance || !isValidBigint(sourceBalance)) {
        err = { code: 'INVALID_SOURCE_BALANCE' };
      } else if (!isBalanceSufficient(ctx)) {
        err = { code: 'SOURCE_BALANCE_INSUFFICIENT' };
      }
    }
  }

  // run async validation after optimistic
  // transition to input_valid_external state was made
  if (isValidInputsState) {
    if (ctx.targetToken.blockchain === 'near') {
      void asyncValidateSendAddress(ctx);
    }
  }

  if (!isValidInputsState && err) {
    fireEvent('errorSet', err);
  } else if (
    ctx.error &&
    !isQuoteError(ctx.error) &&
    !isTransferError(ctx.error)
  ) {
    fireEvent('errorSet', null);
  }

  return isValidInputsState;
};

export const validateInternalInputs = (ctx: Context): boolean | undefined => {
  const isValidInitialState = guardStates(ctx, ['initial_wallet']);
  const isValidInputsState = guardStates(ctx, ['input_valid_internal']);

  if (!isValidInitialState && !isValidInputsState) {
    return undefined;
  }

  const sourceBalance = ctx.sourceTokenBalance;
  let err: InitialInternalStateError | undefined;

  if (isValidInitialState) {
    if (!ctx.sourceToken) {
      err = { code: 'SOURCE_TOKEN_IS_EMPTY' };
    } else if (!ctx.targetToken) {
      err = { code: 'TARGET_TOKEN_IS_EMPTY' };
    } else if (!ctx.targetToken.isIntent) {
      err = { code: 'SOURCE_TOKEN_NOT_INTENT' };
    } else if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
      err = { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' };
    } else if (!ctx.isDepositFromExternalWallet) {
      if (!sourceBalance || !isValidBigint(sourceBalance)) {
        err = { code: 'INVALID_SOURCE_BALANCE' };
      } else if (!isBalanceSufficient(ctx)) {
        err = { code: 'SOURCE_BALANCE_INSUFFICIENT' };
      }
    }
  }

  if (!isValidInputsState && err) {
    fireEvent('errorSet', err);
  } else if (
    ctx.error &&
    !isQuoteError(ctx.error) &&
    !isTransferError(ctx.error)
  ) {
    fireEvent('errorSet', null);
  }

  return isValidInputsState;
};
