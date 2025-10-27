import type { Quote, QuoteDry, QuoteReal } from '@/types/quote';
import type { Token, TokenBalance } from '@/types/token';

import type {
  InitialDryStateError,
  InitialExternalStateError,
  InitialInternalStateError,
  InputValidDryError,
  InputValidWalletError,
  QuoteSuccessError,
} from './errors';

export const initialContext: Readonly<InitialDryContext> = Object.freeze({
  state: 'initial_dry',

  sourceToken: undefined,
  sourceTokenBalance: undefined,
  sourceTokenAmount: '',

  targetToken: undefined,
  targetTokenAmount: '',

  isDepositFromExternalWallet: false,
  walletAddress: undefined,
  sendAddress: undefined,
  error: null,

  quote: undefined,
  quoteStatus: 'idle' as const,
  transferStatus: { status: 'idle' as const },
});

export type Context =
  | InitialDryContext
  | InitialWalletContext
  | InputValidDryContext
  | InputValidInternalContext
  | InputValidExternalContext
  | QuoteSuccessDryContext
  | QuoteSuccessInternalContext
  | QuoteSuccessExternalContext
  | TransferSuccessContext;

export type ContextKeys = Array<keyof Context>;

export type ContextChange = {
  [K in keyof Context]: {
    key: K;
    value: Context[K];
    previousValue: Context[K];
  };
}[keyof Context];

export type InitialDryContext = {
  state: 'initial_dry';

  sourceToken: Token | undefined;
  sourceTokenAmount: string;
  sourceTokenBalance?: never;

  targetToken: Token | undefined;
  targetTokenAmount: string;

  sendAddress?: string;
  walletAddress?: never;
  isDepositFromExternalWallet: boolean;
  error: InitialDryStateError | null;

  quote?: never;
  quoteStatus: 'idle';
  transferStatus: { status: 'idle' };
};

export type InitialWalletContext = {
  state: 'initial_wallet';

  sourceToken: Token | undefined;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token | undefined;
  targetTokenAmount: string;

  walletAddress: string;
  sendAddress: string | undefined;
  isDepositFromExternalWallet: boolean;
  error: InitialInternalStateError | InitialExternalStateError | null;

  quote?: never;
  quoteStatus: 'idle';
  transferStatus: { status: 'idle' };
};

export type InputValidDryContext = {
  state: 'input_valid_dry';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance?: never;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress?: never;
  walletAddress?: string;
  isDepositFromExternalWallet: boolean;
  error: InputValidDryError | null;

  quote?: never;
  quoteStatus: 'idle' | 'pending' | 'error';
  transferStatus: { status: 'idle' };
};

export type InputValidInternalContext = {
  state: 'input_valid_internal';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress?: never;
  walletAddress: string;
  isDepositFromExternalWallet: boolean;
  error: InputValidWalletError | null;

  quote?: never;
  quoteStatus: 'idle' | 'pending' | 'error';
  transferStatus: { status: 'idle' };
};

export type InputValidExternalContext = {
  state: 'input_valid_external';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress: string;
  walletAddress: string;
  isDepositFromExternalWallet: boolean;
  error: InputValidWalletError | null;

  quote?: never;
  quoteStatus: 'idle' | 'pending' | 'error';
  transferStatus: { status: 'idle' };
};

export type QuoteSuccessDryContext = {
  state: 'quote_success_dry';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance?: never;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress?: never;
  walletAddress?: never;
  isDepositFromExternalWallet: boolean;
  error: QuoteSuccessError | null;

  quote: QuoteDry;
  quoteStatus: 'success';
  transferStatus: { status: 'idle' };
};

export type QuoteSuccessInternalContext = {
  state: 'quote_success_internal';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress?: never;
  walletAddress: string;
  isDepositFromExternalWallet: boolean;
  error: QuoteSuccessError | null;

  quote: QuoteReal;
  quoteStatus: 'success';
  transferStatus:
    | { status: 'idle' | 'error'; reason: never }
    | { status: 'pending'; reason: 'PROCESSING' | 'WAITING_CONFIRMATION' };
};

export type QuoteSuccessExternalContext = {
  state: 'quote_success_external';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token;
  targetTokenAmount: string;

  sendAddress: string;
  walletAddress: string;
  isDepositFromExternalWallet: boolean;
  error: QuoteSuccessError | null;

  quote: QuoteReal;
  quoteStatus: 'success';
  transferStatus:
    | { status: 'idle' | 'error'; reason: never }
    | { status: 'pending'; reason: string };
};

export type TransferSuccessContext = {
  state: 'transfer_success';

  sourceToken: Token;
  sourceTokenAmount: string;
  sourceTokenBalance: TokenBalance;

  targetToken: Token;
  targetTokenAmount: string;

  walletAddress: string;
  sendAddress: string | undefined;
  isDepositFromExternalWallet: boolean;
  error?: never;

  quote: Quote | undefined;
  quoteStatus: 'idle' | 'error' | 'pending' | 'success';
  transferStatus: { status: 'success'; reason: never };
};
