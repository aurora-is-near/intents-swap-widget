import {
  ExecutionPollTimeoutError,
  FundingError,
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
  EXECUTION_IN_FLIGHT: {
    title: 'A supply from this wallet is already running',
    detail: 'Wait for it to finish (History shows it), then try again.',
  },
};

/** A supply paid from intents balances: its move, before the supply. */
const FUNDING_COPY: Partial<Record<FundingError['code'], Failure>> = {
  USER_REJECTED: {
    title: 'You declined in your wallet',
    detail: 'Nothing moved.',
  },
  SIGNING_FAILED: {
    title: "Your wallet couldn't sign",
    detail: 'Nothing moved. Try again.',
  },
  FUNDING_IN_FLIGHT: {
    title: 'Another move from this account is running',
    detail: 'Wait for it to finish, then try again.',
  },
  NOT_AUTHORIZED: {
    title: 'Authorize again',
    detail:
      'Your session for private balances ended. Authorize on the Confidential tab, then try again.',
  },
  PUBLIC_KEY_NOT_REGISTERED: {
    title: "This NEAR account can't sign for its intents account yet",
    detail: 'Register its key with NEAR Intents first.',
  },
  UNSUPPORTED_STANDARD: {
    title: "This wallet can't move intents balances yet",
  },
  QUOTE_EXPIRED: {
    title: 'The quote expired before you signed',
    detail: 'Nothing moved. Start over for a fresh one.',
  },
  PAYLOAD_MISMATCH: {
    title: "The quote didn't match what you asked for",
    detail: 'Nothing was signed. Try again.',
  },
  SUBMIT_REJECTED: {
    title: "The move wasn't accepted",
    detail: 'Nothing moved. Try again.',
  },
  SWAP_FAILED: {
    title: "The move didn't go through",
    detail: 'Keep the details below if you contact support.',
  },
  STATUS_TIMEOUT: {
    title: 'Still moving',
    detail: 'It may take a little longer. Reopen this to keep following it.',
  },
  ARRIVAL_TIMEOUT: {
    title: "It hasn't arrived yet",
    detail:
      "The move went through, but the funds haven't shown up yet. Reopen this in a minute.",
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

  if (error instanceof FundingError && FUNDING_COPY[error.code]) {
    return FUNDING_COPY[error.code]!;
  }

  if (error instanceof FundingError && error.code === 'QUOTE_FAILED') {
    return { title: "Couldn't get a quote", detail: error.message };
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

  // The SDK's verdict for a failed last step: a plain `execution
  // OPERATION_FAILED`. The funds stay at the intermediary.
  if (/\bOPERATION_FAILED\b/.test(error.message)) {
    return {
      title: "The supply didn't go through",
      detail:
        "Its last step failed, so the funds stay with this wallet's Aurora account. Try again in a moment.",
    };
  }

  return { title: 'The supply stopped', detail: error.message };
};
