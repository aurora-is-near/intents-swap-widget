import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { isValidBigint } from '@/utils/checkers/isValidBigint';
import { isAuroraToken } from '@/utils/aurora';

import { guardStates } from '@/machine/guards';
import { isBalanceSufficient } from '@/machine/guards/checks/isBalanceSufficient';
import { isQuoteError, isTransferError } from '@/machine/errors';
import type { Context } from '@/machine/context';
import type {
  InitialDryStateError,
  InitialExternalStateError,
  InitialInternalStateError,
} from '@/machine/errors';

import { fireEvent } from './utils/fireEvent';

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

export const validateExternalInputs = (ctx: Context): boolean | undefined => {
  const isValidInitialState = guardStates(ctx, ['initial_wallet']);
  const isValidInputsState = guardStates(ctx, ['input_valid_external']);

  console.log(
    '[DEBUG VALIDATION] validateExternalInputs - isValidInitialState:',
    isValidInitialState,
    'isValidInputsState:',
    isValidInputsState,
  );

  if (!isValidInitialState && !isValidInputsState) {
    return undefined;
  }

  const sourceBalance = ctx.sourceTokenBalance;
  let err: InitialExternalStateError | undefined;

  if (isValidInitialState) {
    console.log('[DEBUG VALIDATION] Checking external inputs...');
    console.log('[DEBUG VALIDATION] sourceToken:', !!ctx.sourceToken);
    console.log('[DEBUG VALIDATION] targetToken:', !!ctx.targetToken);
    console.log(
      '[DEBUG VALIDATION] targetToken.isIntent:',
      ctx.targetToken?.isIntent,
    );
    console.log('[DEBUG VALIDATION] sourceTokenAmount:', ctx.sourceTokenAmount);
    console.log('[DEBUG VALIDATION] sendAddress:', ctx.sendAddress);
    console.log('[DEBUG VALIDATION] sourceBalance:', sourceBalance);
    console.log(
      '[DEBUG VALIDATION] isDepositFromExternalWallet:',
      ctx.isDepositFromExternalWallet,
    );

    if (!ctx.sourceToken) {
      err = { code: 'SOURCE_TOKEN_IS_EMPTY' };
    } else if (!ctx.targetToken) {
      err = { code: 'TARGET_TOKEN_IS_EMPTY' };
    } else if (ctx.targetToken.isIntent) {
      err = { code: 'SOURCE_TOKEN_IS_INTENT' };
    } else if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
      err = { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' };
    } else if (!ctx.sendAddress) {
      // Aurora tokens don't require sendAddress (they use wallet address)
      const isAurora = isAuroraToken(ctx.sourceToken);

      if (!isAurora) {
        err = { code: 'SEND_ADDRESS_IS_EMPTY' };
        console.log('[DEBUG VALIDATION] FAILED: SEND_ADDRESS_IS_EMPTY');
      }
    } else if (!ctx.isDepositFromExternalWallet) {
      if (!sourceBalance || !isValidBigint(sourceBalance)) {
        err = { code: 'INVALID_SOURCE_BALANCE' };
        console.log('[DEBUG VALIDATION] FAILED: INVALID_SOURCE_BALANCE');
      } else if (!isBalanceSufficient(ctx)) {
        err = { code: 'SOURCE_BALANCE_INSUFFICIENT' };
        console.log('[DEBUG VALIDATION] FAILED: SOURCE_BALANCE_INSUFFICIENT');
      }
    }
  }

  if (err) {
    console.log('[DEBUG VALIDATION] Validation error:', err.code);
  } else {
    console.log('[DEBUG VALIDATION] Validation passed!');
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
