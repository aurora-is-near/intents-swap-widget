import { proxy, ref } from 'valtio/vanilla';

import { getWalletIntentsAccountId } from '@/account';
import { IntentsApiError, IntentsConnectError } from '@/errors';
import type {
  GetConfidentialBalancesResult,
  IntentsApi,
} from '@/intentsApi/types';
import type { NearRpcOptions } from '@/near/rpc';
import { proofRpcUrls } from '@/near/rpcUrls';
import { getProofSignerId } from '@/ownership/payload';
import { signOwnershipProof } from '@/ownership/sign';
import type { OwnershipProof } from '@/ownership/types';
import { type KeyValueStorage, memoryStorage } from '@/storage';
import type { WalletConnector } from '@/types/wallet';

export type SessionErrorCode =
  /** There is no session for the current account. Call `authorize()`. */
  | 'NOT_AUTHORIZED'
  /** The refresh token expired or was revoked. Call `authorize()` again. */
  | 'SESSION_EXPIRED'
  /** The auth service could not verify the signed proof. */
  | 'SIGNATURE_REJECTED'
  /**
   * The device clock is too far off: the proof's embedded timestamp fell
   * outside the auth service's 5-minute window.
   */
  | 'CLOCK_SKEW'
  /** The auth service does not accept this wallet's signing standard yet. */
  | 'UNSUPPORTED_STANDARD'
  /** The wallet has no address to authorize. */
  | 'WALLET_NOT_CONNECTED'
  /**
   * The account changed (`restore`, `logout`, another `authorize`) before
   * this call finished; its result was discarded.
   */
  | 'SUPERSEDED';

export class SessionError extends IntentsConnectError {
  constructor(
    readonly code: SessionErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'SessionError';
  }
}

export type IntentsSessionStatus =
  | 'anonymous'
  | 'authorizing'
  | 'authorized'
  | 'expired';

/** Observable session state. Tokens are deliberately not part of it. */
export type IntentsSessionState = {
  status: IntentsSessionStatus;
  /** The intents account the session (or the attempt) belongs to. */
  intentsAccountId?: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt?: number;
  /** Epoch milliseconds. Past this, `authorize()` is needed again. */
  refreshTokenExpiresAt?: number;
  error?: Error;
};

export type IntentsSession = {
  /** A valtio proxy — subscribe to it, or `useSnapshot` it in React. */
  readonly state: IntentsSessionState;
  /**
   * Signs an ownership proof (one wallet prompt) unless one is passed, and
   * exchanges it for a session. Pass the proof `verifyWallet` returned to
   * verify and authorize with a single signature.
   */
  authorize: (
    wallet: Pick<
      WalletConnector,
      'signingStandard' | 'getAddress' | 'getProviders'
    >,
    options?: { proof?: OwnershipProof },
  ) => Promise<void>;
  /** Loads the stored session of an account (or clears state for none). */
  restore: (intentsAccountId: string | undefined) => Promise<void>;
  /** A valid access token, refreshed when it is about to expire. */
  getAccessToken: () => Promise<string>;
  /** Confidential balances of the session's user. Retries once after a 401. */
  getConfidentialBalances: (
    tokenIds?: readonly string[],
  ) => Promise<GetConfidentialBalancesResult>;
  /** Forgets the session, locally. */
  logout: () => Promise<void>;
};

export type CreateIntentsSessionOptions = {
  intentsApi: IntentsApi;
  /**
   * Where tokens are kept. Defaults to memory, so a reload asks the user to
   * sign again. Persisting is a trade-off: the refresh token can mint access
   * tokens for the account until it expires, so anything able to read the
   * storage can read the user's confidential balances.
   */
  storage?: KeyValueStorage;
  /** RPCs for `current_salt` when signing. Defaults to `proofRpcUrls(intentsApi)`. */
  rpc?: NearRpcOptions;
  /** Clock, for tests. */
  now?: () => number;
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

/** Refresh this long before the access token actually expires. */
const REFRESH_MARGIN_MS = 60_000;

export const SESSION_STORAGE_KEY_PREFIX = 'intents-connect.session:';

const storageKey = (intentsAccountId: string) =>
  `${SESSION_STORAGE_KEY_PREFIX}${intentsAccountId}`;

const parseStored = (
  raw: string | null | undefined,
): StoredSession | undefined => {
  if (!raw) {
    return undefined;
  }

  try {
    const value = JSON.parse(raw) as Partial<StoredSession>;

    return typeof value.accessToken === 'string' &&
      typeof value.refreshToken === 'string' &&
      typeof value.accessTokenExpiresAt === 'number' &&
      typeof value.refreshTokenExpiresAt === 'number'
      ? (value as StoredSession)
      : undefined;
  } catch {
    return undefined;
  }
};

const toAuthError = (error: unknown, proof?: OwnershipProof): unknown => {
  if (!(error instanceof IntentsApiError)) {
    return error;
  }

  if (error.status === 401) {
    return new SessionError('SIGNATURE_REJECTED', error.message, {
      cause: error,
    });
  }

  if (error.status === 400 && /timestamp/i.test(error.message)) {
    return new SessionError('CLOCK_SKEW', error.message, { cause: error });
  }

  // The intents-api proxy validates the signed data's shape before
  // forwarding; a standard it does not know fails that validation.
  if (
    error.status === 400 &&
    /signedData/i.test(error.message) &&
    proof?.standard === 'raw_ed25519'
  ) {
    return new SessionError(
      'UNSUPPORTED_STANDARD',
      'the intents API does not accept raw_ed25519 (Solana) sessions yet',
      { cause: error },
    );
  }

  return error;
};

/**
 * A 1Click user session for one intents account at a time, used to read
 * confidential balances.
 *
 * Every operation is tagged with the account it started for: switching
 * accounts (`restore`, `authorize`, `logout`) makes the results of anything
 * still in flight for the previous account land nowhere.
 */
export const createIntentsSession = (
  options: CreateIntentsSessionOptions,
): IntentsSession => {
  const {
    intentsApi,
    storage = memoryStorage(),
    rpc = { rpcUrls: proofRpcUrls(intentsApi) },
    now = Date.now,
  } = options;

  const state = proxy<IntentsSessionState>({ status: 'anonymous' });

  let tokens: StoredSession | undefined;
  let epoch = 0;
  let refreshing: Promise<string> | undefined;

  const setState = (next: IntentsSessionState) => {
    state.status = next.status;
    state.intentsAccountId = next.intentsAccountId;
    state.accessTokenExpiresAt = next.accessTokenExpiresAt;
    state.refreshTokenExpiresAt = next.refreshTokenExpiresAt;
    state.error = next.error ? ref(next.error) : undefined;
  };

  const applyTokens = (intentsAccountId: string, stored: StoredSession) => {
    tokens = stored;
    setState({
      status: 'authorized',
      intentsAccountId,
      accessTokenExpiresAt: stored.accessTokenExpiresAt,
      refreshTokenExpiresAt: stored.refreshTokenExpiresAt,
    });
  };

  const superseded = () =>
    new SessionError(
      'SUPERSEDED',
      'the account changed before this call finished',
    );

  /**
   * Forgets the account's session. `startedAt` pins it to the operation that
   * decided to expire: if the account changed while storage was being
   * cleared, the newer state is left alone.
   */
  const expire = async (
    intentsAccountId: string,
    startedAt: number,
    cause?: unknown,
  ) => {
    tokens = undefined;
    await storage.remove(storageKey(intentsAccountId));

    if (startedAt !== epoch) {
      return;
    }

    setState({
      status: 'expired',
      intentsAccountId,
      error: new SessionError(
        'SESSION_EXPIRED',
        'the session expired — authorize again',
        { cause },
      ),
    });
  };

  const notAuthorized = () =>
    new SessionError(
      'NOT_AUTHORIZED',
      state.status === 'expired'
        ? 'the session expired — authorize again'
        : 'no session — call authorize() first',
    );

  const refresh = (): Promise<string> => {
    const { intentsAccountId } = state;
    const current = tokens;

    if (!current || !intentsAccountId) {
      return Promise.reject(notAuthorized());
    }

    if (refreshing) {
      return refreshing;
    }

    const startedAt = epoch;

    if (current.refreshTokenExpiresAt <= now()) {
      return expire(intentsAccountId, startedAt).then(() => {
        throw notAuthorized();
      });
    }

    refreshing = intentsApi
      .refreshAccessToken(current.refreshToken)
      .then(
        async ({ accessToken, expiresIn }) => {
          if (startedAt !== epoch) {
            throw notAuthorized();
          }

          const stored: StoredSession = {
            ...current,
            accessToken,
            accessTokenExpiresAt: now() + expiresIn * 1000,
          };

          // Persisted under its own account either way; only applied while
          // that account is still the current one.
          await storage.set(
            storageKey(intentsAccountId),
            JSON.stringify(stored),
          );

          if (startedAt !== epoch) {
            throw superseded();
          }

          applyTokens(intentsAccountId, stored);

          return accessToken;
        },
        async (error: unknown) => {
          if (
            startedAt === epoch &&
            error instanceof IntentsApiError &&
            error.isUnauthorized
          ) {
            await expire(intentsAccountId, startedAt, error);
            throw notAuthorized();
          }

          throw error;
        },
      )
      .finally(() => {
        refreshing = undefined;
      });

    return refreshing;
  };

  const getAccessToken = async (): Promise<string> => {
    if (!tokens) {
      throw notAuthorized();
    }

    if (tokens.accessTokenExpiresAt - now() > REFRESH_MARGIN_MS) {
      return tokens.accessToken;
    }

    return refresh();
  };

  return {
    state,

    authorize: async (wallet, { proof } = {}) => {
      const intentsAccountId = proof
        ? getProofSignerId(proof)
        : getWalletIntentsAccountId(wallet);

      if (!intentsAccountId) {
        throw new SessionError(
          'WALLET_NOT_CONNECTED',
          'the wallet has no intents account to authorize',
        );
      }

      epoch += 1;

      const startedAt = epoch;

      tokens = undefined;
      refreshing = undefined;
      setState({ status: 'authorizing', intentsAccountId });

      let signed = proof;

      try {
        signed ??= await signOwnershipProof(wallet, { ...rpc, now });

        const result = await intentsApi.authenticate(signed);

        if (startedAt !== epoch) {
          throw superseded();
        }

        const at = now();
        const stored: StoredSession = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessTokenExpiresAt: at + result.expiresIn * 1000,
          refreshTokenExpiresAt: at + result.refreshExpiresIn * 1000,
        };

        await storage.set(storageKey(intentsAccountId), JSON.stringify(stored));

        if (startedAt !== epoch) {
          throw superseded();
        }

        applyTokens(intentsAccountId, stored);
      } catch (error) {
        const mapped = toAuthError(error, signed);

        if (startedAt === epoch) {
          setState({
            status: 'anonymous',
            intentsAccountId,
            error: mapped instanceof Error ? mapped : undefined,
          });
        }

        throw mapped;
      }
    },

    restore: async (intentsAccountId) => {
      epoch += 1;

      const startedAt = epoch;

      tokens = undefined;
      refreshing = undefined;
      setState({ status: 'anonymous', intentsAccountId });

      if (!intentsAccountId) {
        return;
      }

      const stored = parseStored(
        await storage.get(storageKey(intentsAccountId)),
      );

      if (startedAt !== epoch || !stored) {
        return;
      }

      if (stored.refreshTokenExpiresAt <= now()) {
        await expire(intentsAccountId, startedAt);

        return;
      }

      applyTokens(intentsAccountId, stored);
    },

    getAccessToken,

    getConfidentialBalances: async (tokenIds) => {
      const accessToken = await getAccessToken();

      try {
        return await intentsApi.getConfidentialBalances(accessToken, tokenIds);
      } catch (error) {
        if (!(error instanceof IntentsApiError) || !error.isUnauthorized) {
          throw error;
        }

        // Revoked or clock-skewed early: force one refresh and retry once.
        if (tokens) {
          tokens = { ...tokens, accessTokenExpiresAt: 0 };
        }

        const fresh = await refresh();

        return intentsApi.getConfidentialBalances(fresh, tokenIds);
      }
    },

    logout: async () => {
      epoch += 1;

      const { intentsAccountId } = state;

      tokens = undefined;
      refreshing = undefined;
      // State first and synchronously: nothing after the await may touch it,
      // since another account can become current meanwhile.
      setState({ status: 'anonymous', intentsAccountId });

      if (intentsAccountId) {
        await storage.remove(storageKey(intentsAccountId));
      }
    },
  };
};
