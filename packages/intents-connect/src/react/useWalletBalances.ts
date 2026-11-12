import { useSnapshot } from 'valtio';

import type { IntentsAccountFamily } from '@/account';
import type { BalanceToken } from '@/balances';
import type { ResourceStatus } from '@/resource';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsAccount } from '@/react/useIntentsAccount';
import { useResourceKey } from '@/react/useResourceKey';

export type UseWalletBalancesOptions = {
  /** Milliseconds; `0` disables polling. Defaults to 60_000. */
  refreshIntervalMs?: number;
  /** Another address than the provider wallet's. Needs `family`. */
  address?: string;
  family?: IntentsAccountFamily;
};

export type UseWalletBalancesResult = {
  /** Smallest-unit balances by asset id; a missing token was not read. */
  balances: Readonly<Record<string, string>>;
  /** Chains that could not be read, fully or partly. */
  errors: Readonly<Record<string, Error>>;
  /**
   * 1Click's token list, on every chain: balances are read for those on the
   * wallet family's chains. Also names intents balances (any chain).
   */
  tokens: readonly BalanceToken[];
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

const EMPTY = Object.freeze({});

/**
 * On-chain balances of the provider wallet (or of `address`) for every
 * listed token it can hold — through Alchemy when `alchemyApiKey` is set,
 * public or custom RPCs otherwise.
 */
export const useWalletBalances = ({
  refreshIntervalMs = 60_000,
  address,
  family,
}: UseWalletBalancesOptions = {}): UseWalletBalancesResult => {
  const { walletBalances, tokens, config } = useIntentsAccountContext();
  const account = useIntentsAccount();

  const resolvedFamily = address ? family : account.family;
  const resolvedAddress = address ?? account.address;
  // The source is part of the key: switching Alchemy on must not show the
  // RPC-read result as if it were current.
  const source = config.current.alchemyApiKey ? 'alchemy' : 'rpc';
  const key =
    resolvedFamily && resolvedAddress
      ? `${resolvedFamily}:${resolvedAddress}#${source}`
      : undefined;

  const { snapshot, refresh } = useResourceKey(
    walletBalances,
    key,
    refreshIntervalMs,
  );

  const tokenSnapshot = useSnapshot(tokens.state);

  return {
    balances: snapshot.data?.balances ?? EMPTY,
    errors: snapshot.data?.errors ?? EMPTY,
    tokens: tokenSnapshot.data ?? [],
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
