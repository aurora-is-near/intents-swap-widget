import type { MachineState } from '@/machine/machine';
import type { Context } from '@/machine/context';

import { guardInitialDry } from './guardInitialDry';
import { guardInitialWallet } from './guardInitialWallet';
import { guardInputValidDry } from './guardInputValidDry';
import { guardInputValidExternal } from './guardInputValidExternal';
import { guardInputValidInternal } from './guardInputValidInternal';
import { guardQuoteSuccessDry } from './guardQuoteSuccessDry';
import { guardQuoteSuccessExternal } from './guardQuoteSuccessExternal';
import { guardQuoteSuccessInternal } from './guardQuoteSuccessInternal';
import { guardTransferSuccess } from './guardTransferSuccess';

const guardsMap: Record<MachineState, (ctx: Context) => boolean> = {
  initial_dry: guardInitialDry,
  initial_wallet: guardInitialWallet,
  input_valid_dry: guardInputValidDry,
  input_valid_external: guardInputValidExternal,
  input_valid_internal: guardInputValidInternal,
  quote_success_dry: guardQuoteSuccessDry,
  quote_success_external: guardQuoteSuccessExternal,
  quote_success_internal: guardQuoteSuccessInternal,
  transfer_success: guardTransferSuccess,
};

export const guardStates = <T extends MachineState[]>(
  ctx: Context,
  states: T,
): ctx is Extract<Context, { state: T[number] }> => {
  return states.some((state) => {
    const guard = guardsMap[state];

    return guard ? guard(ctx) : false;
  });
};
