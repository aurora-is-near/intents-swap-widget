import type {
  ErrorType,
  InputValidDryError,
  InputValidWalletError,
  QuoteSuccessDirectTransferError,
  QuoteSuccessTransferError,
} from '@/machine/errors';

export class MachineError<E extends ErrorType> extends Error {
  data: E;

  constructor(data: E) {
    super(data.code);
    this.data = data;
  }
}

export class QuoteError extends MachineError<
  InputValidDryError | InputValidWalletError
> {}

export class TransferError extends MachineError<
  QuoteSuccessTransferError | QuoteSuccessDirectTransferError
> {}
