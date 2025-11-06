import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';
import type { AxiosResponse } from 'axios';

import { useConfig } from '@/config';
import { bridgeApi } from '@/network';
import { WidgetError } from '@/errors';
import { useUnsafeSnapshot } from '@/machine';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { CHAIN_POA_MAP, POA_EVM_CHAIN_ID } from '@/constants/chains';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import type { Chains } from '@/types/chain';

type Args = {
  depositAddress: string;
};

type PollArgs = {
  amount: string;
  assetId: string;
  blockchain: Chains;
};

type DepositResult = {
  chain: string;
  amount: number;
  address: string;
  account_id: string;
  near_token_id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  tx_hash?: string;
};

type DepositStatusResponse = {
  result: {
    deposits: DepositResult[];
  };
};

const getMatchedDeposit = (
  response: DepositStatusResponse,
  data: {
    intentsAccountId: string;
    depositAddress: string;
    assetId: string;
    chainId: string;
    amount: string;
  },
) => {
  // remove nep141: prefix as Bridge API response doesn't have it
  const nearTokenId = data.assetId.substring(data.assetId.indexOf(':') + 1);

  return (response.result.deposits || []).find(
    (deposit) =>
      deposit.chain === data.chainId &&
      deposit.account_id === data.intentsAccountId &&
      deposit.address === data.depositAddress &&
      deposit.near_token_id === nearTokenId &&
      // API returns amount as a number so if decimals is higher than number's precision some of the digits can be lost
      // so here we check only that amount starts with the expected value
      data.amount.startsWith(deposit.amount.toString()),
  );
};

const oneClickBridgeStatusMap: Record<
  DepositResult['status'],
  GetExecutionStatusResponse.status
> = {
  PENDING: GetExecutionStatusResponse.status.PROCESSING,
  COMPLETED: GetExecutionStatusResponse.status.SUCCESS,
  FAILED: GetExecutionStatusResponse.status.FAILED,
};

export const usePoaExternalDepositStatus = ({ depositAddress }: Args) => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useConfig();

  const intentsAccountId = getIntentsAccountId({
    addressType: intentsAccountType,
    walletAddress: ctx.walletAddress ?? '',
  });

  const pollDepositStatus = async ({
    blockchain,
    amount,
    assetId,
  }: PollArgs) => {
    if (!intentsAccountId) {
      throw new WidgetError('Unknown intents account for POA deposit check');
    }

    let chainId = CHAIN_POA_MAP[blockchain];

    if (!chainId) {
      const isEvm = isEvmChain(blockchain);

      if (isEvm) {
        chainId = POA_EVM_CHAIN_ID;
      } else {
        throw new WidgetError(
          `Unknown chain for POA deposit check ${blockchain}`,
        );
      }
    }

    const response = await bridgeApi.post<
      DepositStatusResponse,
      AxiosResponse<DepositStatusResponse>
    >('', {
      id: 1,
      jsonrpc: '2.0',
      method: 'recent_deposits',
      params: [
        {
          account_id: intentsAccountId,
          chain: chainId,
        },
      ],
    });

    const matchedDeposit = getMatchedDeposit(response.data, {
      intentsAccountId,
      depositAddress,
      chainId,
      assetId,
      amount,
    });

    if (!matchedDeposit) {
      return {
        status: GetExecutionStatusResponse.status.PENDING_DEPOSIT,
        swapDetails: {
          destinationChainTxHashes: [{ hash: '' }],
          intentHashes: [''],
        },
      };
    }

    return {
      status: oneClickBridgeStatusMap[matchedDeposit.status],
      swapDetails: {
        intentHashes: [''],
        destinationChainTxHashes: [{ hash: matchedDeposit.tx_hash ?? '' }],
      },
    };
  };

  return { pollDepositStatus };
};
