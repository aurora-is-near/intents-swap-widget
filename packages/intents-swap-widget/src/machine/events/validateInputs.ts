import { fireEvent } from './utils/fireEvent';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { isValidBigint } from '@/utils/checkers/isValidBigint';

import { guardStates } from '@/machine/guards';
import { isBalanceSufficient } from '@/machine/guards/checks/isBalanceSufficient';
import { isQuoteError, isTransferError } from '@/machine/errors';
import type { Context } from '@/machine/context';
import type {
  InitialDryStateError,
  InitialExternalStateError,
  InitialInternalStateError,
} from '@/machine/errors';

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
