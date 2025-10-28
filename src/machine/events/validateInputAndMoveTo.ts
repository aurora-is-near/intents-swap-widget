import { moveTo } from '@/machine';
import type { Context } from '@/machine/context';
import { isDryQuote } from '@/machine/guards/checks/isDryQuote';
import {
  validateDryInputs,
  validateExternalInputs,
  validateInternalInputs,
} from './validateInputs';

export const validateInputAndMoveTo = (ctx: Context) => {
  const isDryRun = isDryQuote(ctx);

  const isInternal = !isDryRun && ctx.targetToken?.isIntent === true;
  const isExternal = !isDryRun && ctx.targetToken?.isIntent === false;

  if (isDryRun) {
    const isValidDryInput = validateDryInputs(ctx);

    return moveTo(isValidDryInput ? 'input_valid_dry' : 'initial_dry');
  }

  if (isExternal && validateExternalInputs(ctx)) {
    moveTo('input_valid_external');
  } else if (isInternal && validateInternalInputs(ctx)) {
    moveTo('input_valid_internal');
  } else {
    moveTo('initial_wallet');
  }
};
