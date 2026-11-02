import { useQuery } from '@tanstack/react-query';

import type { Token } from '@aurora-is-near/intents-swap-widget';

import { getAccountIntentsId } from '../accounts/intentsAccountId';
import type { Account } from '../accounts/types';
import { getPersistentDepositAddress, isRetryable } from './feeService';
import type { DepositAddress } from './feeService';
import type { DepositNetwork } from './networks';
import { useDepositDestination } from './useDepositDestination';

// Per destination asset: addresses for another asset are another account.
const storageKey = (intentsId: string, destination: Token) =>
  `depositAddresses:${intentsId}:${destination.assetId}`;

type Cached = Partial<Record<DepositNetwork['id'], DepositAddress>>;

const readCache = async (
  intentsId: string,
  destination: Token,
): Promise<Cached> => {
  const key = storageKey(intentsId, destination);

  return (
    ((await chrome.storage.local.get(key))[key] as Cached | undefined) ?? {}
  );
};

const fetchDepositAddress = async (
  account: Account,
  network: DepositNetwork,
  destination: Token,
): Promise<DepositAddress> => {
  const intentsId = getAccountIntentsId(account);
  const cached = (await readCache(intentsId, destination))[network.id];

  if (cached) {
    return cached;
  }

  const address = await getPersistentDepositAddress({
    recipient: intentsId,
    // The intents ID, not the local account id, so a reinstall maps to the
    // same addresses.
    sender: `aurora-intents-wallet-ext:${intentsId}`,
    depositChain: network.id,
    destination: { chain: destination.blockchain, asset: destination.assetId },
  });

  // Re-read: other networks may have been stored meanwhile.
  await chrome.storage.local.set({
    [storageKey(intentsId, destination)]: {
      ...(await readCache(intentsId, destination)),
      [network.id]: address,
    },
  });

  return address;
};

/**
 * The account's persistent deposit address on a network. Addresses never
 * change, so they are cached in storage after the first lookup.
 */
export const useDepositAddress = (
  account: Account,
  network: DepositNetwork,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const destination = useDepositDestination();

  return useQuery({
    queryKey: [
      'depositAddress',
      getAccountIntentsId(account),
      destination?.assetId,
      network.id,
    ],
    queryFn: () => fetchDepositAddress(account, network, destination!),
    // The destination comes from the token list, which loads first.
    enabled: enabled && !!destination,
    staleTime: Infinity,
    // A 4xx (unknown key, no PDA access, unsupported chain) won't change.
    retry: (failures, error) => failures < 3 && isRetryable(error),
  });
};
