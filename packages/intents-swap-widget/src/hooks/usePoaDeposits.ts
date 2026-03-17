import { useQuery } from '@tanstack/react-query';

import type { AxiosResponse } from 'axios';
import { bridgeApi } from '@/network';
import { CHAIN_POA_MAP } from '@/constants/chains';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { getIntentsAccountTypeFromAddress } from '@/utils/chains/getIntentsAccountTypeFromAddress';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import type { FakeTransaction, TransactionStatus } from '@/types/transaction';
import type { Token } from '@/types/token';

type PoaDeposit = {
  chain: string;
  amount: number | string;
  address: string;
  account_id: string;
  created_at: string;
  near_token_id: string;
  defuse_asset_identifier: string;
  decimals: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CREDITED';
  tx_hash?: string;
  mint_tx_hash?: string;
  from?: string;
};

type RecentDepositsResponse = {
  result: {
    deposits: PoaDeposit[];
  };
};

const POA_STATUS_MAP: Record<PoaDeposit['status'], TransactionStatus> = {
  COMPLETED: 'SUCCESS',
  CREDITED: 'PROCESSING',
  PENDING: 'PROCESSING',
  FAILED: 'FAILED',
};

const POA_CHAINS = Object.values(CHAIN_POA_MAP).filter((v): v is string => !!v);

const fetchRecentDeposits = async (
  accountId: string,
  chain: string,
): Promise<PoaDeposit[]> => {
  const response = await bridgeApi.post<
    RecentDepositsResponse,
    AxiosResponse<RecentDepositsResponse>
  >('', {
    id: 1,
    jsonrpc: '2.0',
    method: 'recent_deposits',
    params: [{ account_id: accountId, chain }],
  });

  return response.data.result?.deposits ?? [];
};

const depositToFakeTransaction = (
  deposit: PoaDeposit,
  tokens: Token[],
): FakeTransaction => {
  const assetId = `nep141:${deposit.near_token_id}`;

  // API returns amount as a number (e.g. 7e+23) which loses precision.
  // Convert to a BigInt-safe string for formatBigToHuman.
  let amountStr: string;

  try {
    amountStr = BigInt(deposit.amount).toString();
  } catch {
    amountStr = String(deposit.amount);
  }

  const formatted = formatBigToHuman(amountStr, deposit.decimals);

  const token = tokens.find((t) => t.assetId === assetId);
  const amountUsd =
    token && formatted ? `${parseFloat(formatted) * token.price}` : '';

  return {
    originAsset: assetId,
    destinationAsset: assetId,
    amountInFormatted: formatted,
    amountOutFormatted: formatted,
    createdAt: deposit.created_at,
    status: POA_STATUS_MAP[deposit.status],
    amountInUsd: amountUsd,
    amountOutUsd: amountUsd,
    senders: [deposit.from ?? deposit.address],
    recipient: deposit.account_id,
    originChainTxHashes: deposit.tx_hash ? [deposit.tx_hash] : [],
    isPoaDeposit: true,
  };
};

const POLLING_INTERVAL_MS = 10_000;

export const usePoaDeposits = (
  walletAddress: string | null | undefined,
  tokens: Token[],
) => {
  const addressType = walletAddress
    ? getIntentsAccountTypeFromAddress(walletAddress)
    : undefined;

  const intentsAccountId = getIntentsAccountId({
    walletAddress: walletAddress ?? undefined,
    addressType,
  });

  return useQuery({
    queryKey: ['poa-deposits', intentsAccountId],
    queryFn: async (): Promise<FakeTransaction[]> => {
      if (!intentsAccountId) {
        return [];
      }

      const results = await Promise.allSettled(
        POA_CHAINS.map((chain) => fetchRecentDeposits(intentsAccountId, chain)),
      );

      const deposits = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      );

      return deposits.map((d) => depositToFakeTransaction(d, tokens));
    },
    enabled: !!intentsAccountId,
    refetchInterval: (query) => {
      const txs = query.state.data ?? [];
      const hasPending = txs.some((tx) =>
        ['PROCESSING', 'PENDING'].includes(tx.status),
      );

      return hasPending ? POLLING_INTERVAL_MS : false;
    },
  });
};
