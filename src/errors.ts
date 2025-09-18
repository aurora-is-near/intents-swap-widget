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
    this.name = 'MachineError';
  }
}

export class QuoteError extends MachineError<
  InputValidDryError | InputValidWalletError
> {
  constructor(data: InputValidDryError | InputValidWalletError) {
    super(data);
    this.name = 'QuoteError';
  }
}

export class TransferError extends MachineError<
  QuoteSuccessTransferError | QuoteSuccessDirectTransferError
> {
  constructor(
    data: QuoteSuccessTransferError | QuoteSuccessDirectTransferError,
  ) {
    super(data);
    this.name = 'TransferError';
  }
}
