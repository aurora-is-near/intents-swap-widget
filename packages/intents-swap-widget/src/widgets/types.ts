import { ReactElement } from 'react';
import { IntentsTransferArgs, QuoteTransferArgs } from '../types';

export type TokenInputType = 'source' | 'target';
export type TokenModalState = 'source' | 'target' | 'none';
export type QuoteType = 'exact_in' | 'exact_out';

export type CommonWidgetProps<Msg> = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg?: (msg: Msg) => void;
    isLoading?: boolean;
    FooterComponent?: ReactElement;
    isFullPage?: boolean;
  };
