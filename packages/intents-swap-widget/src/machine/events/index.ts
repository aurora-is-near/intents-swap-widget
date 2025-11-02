import { reset } from './reset';
import { tokenSelectRotate } from './tokenSelectRotate';
import { errorSet, type ErrorSetPayload } from './errorSet';
import { quoteSet, type QuoteSetPayload } from './quoteSet';
import { addressSet, type AddressSetPayload } from './addressSet';
import { tokenSelect, type TokenSelectPayload } from './tokenSelect';
import { tokenSetAmount, type TokenSetAmountPayload } from './tokenSetAmount';
import { quoteSetStatus, type QuoteSetStatusPayload } from './quoteSetStatus';
import { depositTypeSet, type DepositTypeSetPayload } from './depositTypeSet';
import {
  validateDryInputs,
  validateExternalInputs,
  validateInternalInputs,
} from './validateInputs';
import {
  walletAddressSet,
  type WalletAddressSetPayload,
} from './walletAddressSet';
import {
  tokenSetBalance,
  type TokenSetBalancePayload,
} from './tokenSetBalance';
import {
  transferSetStatus,
  type TransferSetStatusPayload,
} from './transferSetStatus';
import type { Context } from '@/machine/context';
import { machine } from '@/machine/machine';

export type TradeEvents = {
  reset: null;
  tokenSelectRotate: null;
  validateDryInputs: null;
  validateExternalInputs: null;
  validateInternalInputs: null;
  tokenSelect: TokenSelectPayload;
  tokenSetAmount: TokenSetAmountPayload;
  tokenSetBalance: TokenSetBalancePayload;
  addressSet: AddressSetPayload;
  errorSet: ErrorSetPayload;
  quoteSet: QuoteSetPayload;
  depositTypeSet: DepositTypeSetPayload;
  quoteSetStatus: QuoteSetStatusPayload;
  transferSetStatus: TransferSetStatusPayload;
  walletAddressSet: WalletAddressSetPayload;
};

const onEvent = <E extends keyof TradeEvents>(
  event: E,
  handler: (ctx: Context, payload: TradeEvents[E]) => void,
) => {
  machine.on(event, (ctx, payload) => handler(ctx, payload as TradeEvents[E]));
};

export const registerEvents = () => {
  onEvent('quoteSetStatus', quoteSetStatus);
  onEvent('walletAddressSet', walletAddressSet);
  onEvent('transferSetStatus', transferSetStatus);
  onEvent('tokenSelectRotate', tokenSelectRotate);
  onEvent('tokenSetBalance', tokenSetBalance);
  onEvent('tokenSetAmount', tokenSetAmount);
  onEvent('depositTypeSet', depositTypeSet);
  onEvent('tokenSelect', tokenSelect);
  onEvent('addressSet', addressSet);
  onEvent('errorSet', errorSet);
  onEvent('quoteSet', quoteSet);
  onEvent('reset', reset);

  // use with caution since these just return a boolean flag and set
  // a specific error to the context
  //
  // DO NOT USE IT FOR CONTEXT CHECKS
  // - use guards (runtime validation) if you mutate context or move state
  // - use state narrowing (no runtime validation) if you check context to just read from it
  onEvent('validateDryInputs', validateDryInputs);
  onEvent('validateExternalInputs', validateExternalInputs);
  onEvent('validateInternalInputs', validateInternalInputs);
};
