import { viewCall } from '@aurora-is-near/intents-connect';

/** `storage_balance_bounds().min` — the registration cost for a NEP-141. */
export const getMinStorageBalance = async (
  contractId: string,
  rpcUrls?: readonly string[],
): Promise<bigint> => {
  const bounds = await viewCall<{ min: string }>({
    contractId,
    methodName: 'storage_balance_bounds',
    args: {},
    rpcUrls,
  });

  return BigInt(bounds.min);
};

/** `storage_balance_of(accountId).total`, or 0 when unregistered. */
export const getStorageBalance = async (
  contractId: string,
  accountId: string,
  rpcUrls?: readonly string[],
): Promise<bigint> => {
  const balance = await viewCall<{ total: string } | null>({
    contractId,
    methodName: 'storage_balance_of',
    args: { account_id: accountId },
    rpcUrls,
  });

  return BigInt(balance?.total ?? '0');
};
