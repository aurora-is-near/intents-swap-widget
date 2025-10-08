import { snapshot } from 'valtio';

import type {
  ErrorType,
  InputValidDryError,
  InputValidWalletError,
  QuoteSuccessDirectTransferError,
  QuoteSuccessTransferError,
} from '@/machine/errors';
import { machine } from '@/machine';
import type { Context } from '@/machine/context';

const store = machine.getStore();

export class WidgetError extends Error {
  context: Context;

  constructor(message: string, meta?: { cause?: unknown }) {
    super(message);
    this.name = 'WidgetError';
    this.cause = meta?.cause;
    this.context = snapshot(store).context;
  }
}

export class MachineError<E extends ErrorType> extends WidgetError {
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
