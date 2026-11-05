import {
  ExecutionPollTimeoutError,
  GuardError,
  IntentsConnectApiError,
  isUserRejection,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';

type Failure = {
  title: string;
  detail?: string;
  /** The execution is still live: offer to keep following it. */
  stillLive?: string;
};

const GUARD_COPY: Partial<Record<GuardError['code'], Failure>> = {
  QUOTE_MOVED: {
    title: 'The price moved while preparing',
    detail: 'Go back and submit again for a fresh quote.',
  },
  FEE_EXCEEDS_AMOUNT: {
    title: 'Too small to supply',
    detail: 'The network fee is more than the amount. Enter more.',
  },
  NETWORK_MISMATCH: {
    title: 'Your wallet is on another network',
    detail: 'Switch it to the asset’s network and try again.',
  },
  WALLET_NOT_CONNECTED: {
    title: 'Your wallet disconnected',
    detail: 'Connect it again and retry.',
  },
};

/** What went wrong, in words a user can act on. */
export const describeFailure = (error: Error, symbol: string): Failure => {
  const { cause } = error;

  if (isUserRejection(error) || isUserRejection(cause)) {
    return {
      title: 'You declined in your wallet',
      detail: 'Nothing was sent.',
    };
  }

  if (
    /insufficient funds|insufficient balance/i.test(
      `${error.message} ${String((cause as Error | undefined)?.message ?? '')}`,
    )
  ) {
    return {
      title: `Not enough ${symbol}`,
      detail: 'Your wallet needs the amount plus gas for the transfer.',
    };
  }

  if (error instanceof GuardError && GUARD_COPY[error.code]) {
    return GUARD_COPY[error.code]!;
  }

  if (error instanceof ExecutionPollTimeoutError) {
    return {
      title: 'Still processing',
      detail: 'It may take a little longer. Keep following it here.',
      stillLive: error.executionId,
    };
  }

  if (error instanceof RunnerDisposedError) {
    return {
      title: 'Your wallet changed mid-supply',
      detail: 'Switch back to the wallet that started it to follow it.',
    };
  }

  if (error instanceof IntentsConnectApiError && error.status >= 500) {
    return {
      title: 'The service had a problem',
      detail: 'Try again in a moment.',
    };
  }

  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return {
      title: 'Couldn’t reach the service',
      detail: 'Check your connection and try again.',
    };
  }

  return { title: 'The supply stopped', detail: error.message };
};
