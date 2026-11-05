import { type ReactNode, useEffect, useRef, useState } from 'react';

import { getWalletIntentsAccountId } from '@/account';
import type { SupportedTokensFlow } from '@/api/types';
import { getTokens, getWalletBalances } from '@/balances';
import type { BalanceToken } from '@/balances';
import { IntentsConnectError } from '@/errors';
import { getIntermediaryBalance } from '@/funding/intermediaryBalance';
import { createFundingStore } from '@/funding/store';
import type { IntentsApi } from '@/intentsApi/types';
import { proofRpcUrls } from '@/near/rpcUrls';
import { createResource, createResourceCache } from '@/resource';
import { createIntentsSession } from '@/session';
import type {
  Execution,
  ExecutionStatus,
  Intermediary,
} from '@/types/execution';
import type { RecipeDestination } from '@/types/recipe';
import { createVerificationStore } from '@/verification';
import {
  type IntentsAccountConfig,
  IntentsAccountContext,
  type IntentsAccountContextValue,
  type IntentsAccountProps,
} from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';

/** The token list changes rarely; refetched when older than this. */
const TOKENS_MAX_AGE_MS = 10 * 60_000;

const missingApi = () =>
  Promise.reject(new IntentsConnectError('intentsApi is required'));

/**
 * Stands in for an absent `intentsApi` so the stores can exist unconditionally.
 * Never reached in practice: account hooks refuse to run without the prop.
 */
const NO_INTENTS_API: IntentsApi = {
  apiKey: '',
  baseUrl: '',
  nearRpcUrl: '',
  getTokens: missingApi,
  getIntentsAccountBalances: missingApi,
  authenticate: missingApi,
  refreshAccessToken: missingApi,
  getConfidentialBalances: missingApi,
  getQuote: missingApi,
  generateIntent: missingApi,
  submitIntent: missingApi,
  getSwapStatus: missingApi,
};

const requireApi = (config: IntentsAccountConfig) => {
  if (!config.intentsApi) {
    throw new IntentsConnectError('intentsApi is required');
  }

  return config.intentsApi;
};

const createStores = (
  config: { current: IntentsAccountConfig },
  props: IntentsAccountProps,
): IntentsAccountContextValue => {
  const api = props.intentsApi;
  const session = createIntentsSession({
    intentsApi: api ?? NO_INTENTS_API,
    storage: props.sessionStorage,
    rpc: { rpcUrls: proofRpcUrls(api) },
  });

  const tokens = createResource<BalanceToken[]>(() =>
    getTokens(requireApi(config.current)),
  );

  const loadTokens = async (): Promise<BalanceToken[]> => {
    const { state } = tokens;
    const fresh =
      state.status === 'success' &&
      state.data &&
      Date.now() - (state.updatedAt ?? 0) < TOKENS_MAX_AGE_MS;

    if (fresh) {
      return state.data!;
    }

    const loaded = await tokens.refresh('tokens');

    if (!loaded) {
      throw tokens.state.error ?? new Error('token list unavailable');
    }

    return loaded;
  };

  // The intermediary is deterministic per wallet: resolved once per address.
  const intermediaries = new Map<string, Promise<Intermediary>>();

  const resolveIntermediary = (address: string, publicKey?: string) => {
    const key = `${address}|${publicKey ?? ''}`;
    let pending = intermediaries.get(key);

    if (!pending) {
      const { connectApi } = config.current;

      if (!connectApi) {
        return Promise.reject(
          new IntentsConnectError('the Intents Connect API is required'),
        );
      }

      pending = connectApi.getIntermediary(address, { publicKey });
      pending.catch(() => intermediaries.delete(key));
      intermediaries.set(key, pending);
    }

    return pending;
  };

  return {
    config,
    session,
    verification: createVerificationStore({
      storage: props.verificationStorage,
    }),
    tokens,

    // key: `${family}:${address}#${source}` — the source only splits caches.
    walletBalances: createResourceCache(async (key) => {
      const [account = ''] = key.split('#');
      const separator = account.indexOf(':');
      const family = account.slice(0, separator) as 'evm' | 'sol' | 'near';
      const address = account.slice(separator + 1);
      const { alchemyApiKey, rpcs, intentsApi } = config.current;

      return getWalletBalances({
        family,
        address,
        tokens: await loadTokens(),
        alchemyApiKey,
        rpcs,
        intentsApi,
      });
    }),

    // key: intents account id
    intentsBalances: createResourceCache((intentsAccountId) =>
      requireApi(config.current).getIntentsAccountBalances(intentsAccountId),
    ),

    // key: `${intentsAccountId}|${sorted token ids}`
    confidentialBalances: createResourceCache((key) => {
      const tokenIds = key.slice(key.indexOf('|') + 1);

      return session.getConfidentialBalances(
        tokenIds ? tokenIds.split(',') : undefined,
      );
    }),

    funding: createFundingStore({ storage: props.fundingStorage }),

    intermediaryBalances: createResourceCache(async (key) => {
      const [address, publicKey, destination] = JSON.parse(key) as [
        string,
        string | null,
        RecipeDestination,
      ];

      const intermediary = await resolveIntermediary(
        address,
        publicKey ?? undefined,
      );

      return {
        intermediary: intermediary.evm,
        balance: await getIntermediaryBalance({
          intermediary,
          destination,
          rpcs: config.current.rpcs,
        }),
      };
    }),

    // key: `[address, statuses]`. Needs only the Intents Connect API.
    walletExecutions: createResourceCache(async (key) => {
      const [address, statuses] = JSON.parse(key) as [
        string,
        ExecutionStatus[],
      ];

      const { connectApi } = config.current;

      if (!connectApi) {
        throw new IntentsConnectError('the Intents Connect API is required');
      }

      const executions = await connectApi.listExecutions(
        address,
        statuses.length ? { status: statuses } : undefined,
      );

      // Newest first; one without a creation time goes last.
      const time = ({ createdAt }: Execution) =>
        Date.parse(createdAt ?? '') || 0;

      return [...executions].sort((a, b) => time(b) - time(a));
    }),

    // key: the flow. Needs only the Intents Connect API.
    supportedTokens: createResourceCache((flow) => {
      const { connectApi } = config.current;

      return connectApi
        ? connectApi.listSupportedTokens(flow as SupportedTokensFlow)
        : Promise.reject(
            new IntentsConnectError('the Intents Connect API is required'),
          );
    }),
  };
};

/**
 * Account stores shared by the account hooks. Rendered by
 * `IntentsConnectProvider`; use that instead.
 *
 * Stores are created once per intents-api identity (`apiKey` + `baseUrl`),
 * not per client object: a client created inline in a render must not reset
 * the session or refetch everything on every render.
 */
export const IntentsAccountProvider = ({
  children,
  ...props
}: IntentsAccountProps & { children: ReactNode }) => {
  const { intentsApi, alchemyApiKey, rpcs } = props;
  const { wallet, api: connectApi } = useIntentsConnect();

  const config = useRef<IntentsAccountConfig>({
    intentsApi,
    alchemyApiKey,
    rpcs,
    connectApi,
  });

  config.current = { intentsApi, alchemyApiKey, rpcs, connectApi };

  const identity = intentsApi
    ? `${intentsApi.apiKey}|${intentsApi.baseUrl}`
    : '';

  const [entry, setEntry] = useState(() => ({
    identity,
    stores: createStores(config, props),
  }));

  // A different API identity is a different backend: start over.
  const stale = entry.identity !== identity;

  useEffect(() => {
    if (stale) {
      setEntry({ identity, stores: createStores(config, props) });
    }
    // Only the identity decides; props are read when it changes.
  }, [stale, identity]);

  const { stores } = entry;
  const intentsAccountId = getWalletIntentsAccountId(wallet);

  useEffect(() => {
    void stores.verification.hydrate();
  }, [stores]);

  // Picks up a stored session when the wallet (account) changes.
  useEffect(() => {
    void stores.session.restore(intentsAccountId);
  }, [stores, intentsAccountId]);

  return (
    <IntentsAccountContext.Provider value={stores}>
      {children}
    </IntentsAccountContext.Provider>
  );
};
