import { createContext, type MutableRefObject, useContext } from 'react';

import type { IntentsConnectApi, SupportedTokensResult } from '@/api/types';
import type { BalanceToken, ChainRpcUrls, WalletBalances } from '@/balances';
import { IntentsConnectError } from '@/errors';
import type { FundingStore } from '@/funding/store';
import type {
  GetConfidentialBalancesResult,
  GetIntentsAccountBalancesResult,
  IntentsApi,
} from '@/intentsApi/types';
import type { Resource, ResourceCache } from '@/resource';
import type { Execution } from '@/types/execution';
import type { IntentsSession } from '@/session';
import type { KeyValueStorage } from '@/storage';
import type { VerificationStore } from '@/verification';

/** Optional `IntentsConnectProvider` props for the account features. */
export type IntentsAccountProps = {
  /**
   * The intents-api client. Required by every account hook (balances,
   * verification, authorization); `useExecution` does not need it.
   */
  intentsApi?: IntentsApi;
  /** Reads EVM and Solana wallet balances through Alchemy when set. */
  alchemyApiKey?: string;
  /** TronGrid's API key, for TRON balances: without one, ~1 request/s. */
  tronGridApiKey?: string;
  /** Per-chain RPC endpoints, merged over `DEFAULT_RPCS`. */
  rpcs?: ChainRpcUrls;
  /**
   * Where user sessions are kept. Memory by default — read once, at mount.
   * See `createIntentsSession` before persisting.
   */
  sessionStorage?: KeyValueStorage;
  /** Where verified wallets are remembered. `localStorage` by default. */
  verificationStorage?: KeyValueStorage;
  /**
   * Where fundings from intents balances are tracked, so a signed transfer
   * is followed to the end after a reload. `localStorage` by default.
   */
  fundingStorage?: KeyValueStorage;
};

export type IntentsAccountConfig = Pick<
  IntentsAccountProps,
  'intentsApi' | 'alchemyApiKey' | 'tronGridApiKey' | 'rpcs'
> & {
  /** The Intents Connect API of the surrounding provider. */
  connectApi?: IntentsConnectApi;
};

/** The intermediary of a wallet and what it holds of one token. */
export type IntermediaryBalance = {
  /** The intermediary's EVM address. */
  intermediary: string;
  /** Smallest unit. */
  balance: string;
};

/** Provider-level stores: every hook reading the same data shares one fetch. */
export type IntentsAccountContextValue = {
  /** Latest props, read by fetchers at call time. */
  config: MutableRefObject<IntentsAccountConfig>;
  session: IntentsSession;
  verification: VerificationStore;
  tokens: Resource<BalanceToken[]>;
  walletBalances: ResourceCache<WalletBalances>;
  intentsBalances: ResourceCache<GetIntentsAccountBalancesResult>;
  confidentialBalances: ResourceCache<GetConfidentialBalancesResult>;
  funding: FundingStore;
  /** key: `JSON.stringify([address, publicKey, destination])` */
  intermediaryBalances: ResourceCache<IntermediaryBalance>;
  /** key: the flow (`inOperation`, `outOperation`) */
  supportedTokens: ResourceCache<SupportedTokensResult>;
  /** key: `JSON.stringify([address, sorted statuses])` */
  walletExecutions: ResourceCache<Execution[]>;
};

export const IntentsAccountContext =
  createContext<IntentsAccountContextValue | null>(null);

export const useIntentsAccountContext = (): IntentsAccountContextValue & {
  intentsApi: IntentsApi;
} => {
  const value = useContext(IntentsAccountContext);

  if (!value) {
    throw new IntentsConnectError(
      'account hooks must be used inside an <IntentsConnectProvider>',
    );
  }

  const { intentsApi } = value.config.current;

  if (!intentsApi) {
    throw new IntentsConnectError(
      'pass `intentsApi` to <IntentsConnectProvider> to use account hooks',
    );
  }

  return { ...value, intentsApi };
};
