import { useQuery } from '@tanstack/react-query';

import { getAccountIntentsId } from '../accounts/intentsAccountId';
import type { Account } from '../accounts/types';
import { DEPOSIT_ASSET } from '../config';
import { getPersistentDepositAddress, isRetryable } from './feeService';
import type { DepositAddress } from './feeService';
import type { DepositNetwork } from './networks';

const storageKey = (intentsId: string) => `depositAddresses:${intentsId}`;

type Cached = Partial<Record<DepositNetwork['id'], DepositAddress>>;

const readCache = async (intentsId: string): Promise<Cached> => {
  const key = storageKey(intentsId);

  return (
    ((await chrome.storage.local.get(key))[key] as Cached | undefined) ?? {}
  );
};

const fetchDepositAddress = async (
  account: Account,
  network: DepositNetwork,
): Promise<DepositAddress> => {
  const intentsId = getAccountIntentsId(account);
  const cached = (await readCache(intentsId))[network.id];

  if (cached) {
    return cached;
  }

  const address = await getPersistentDepositAddress({
    recipient: intentsId,
    // The intents ID, not the local account id, so a reinstall maps to the
    // same addresses.
    sender: `aurora-intents-wallet-ext:${intentsId}`,
    depositChain: network.id,
    destination: DEPOSIT_ASSET,
  });

  // Re-read: other networks may have been stored meanwhile.
  await chrome.storage.local.set({
    [storageKey(intentsId)]: {
      ...(await readCache(intentsId)),
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
) =>
  useQuery({
    queryKey: ['depositAddress', getAccountIntentsId(account), network.id],
    queryFn: () => fetchDepositAddress(account, network),
    enabled,
    staleTime: Infinity,
    // A 4xx (unknown key, no PDA access, unsupported chain) won't change.
    retry: (failures, error) => failures < 3 && isRetryable(error),
  });
