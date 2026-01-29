import { MakeTransfer } from '../types';

export type TokenInputType = 'source' | 'target';
export type TokenModalState = 'source' | 'target' | 'none';
export type QuoteType = 'exact_in' | 'exact_out';

export type CommonWidgetProps<Msg> = {
  onMsg?: (msg: Msg) => void;
  isLoading?: boolean;
  makeTransfer?: MakeTransfer;
};
