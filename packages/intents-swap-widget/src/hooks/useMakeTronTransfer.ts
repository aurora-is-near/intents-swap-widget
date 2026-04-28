import { base58, hex } from '@scure/base';

import type { MakeTransferArgs } from '../types';
import type { TronProvider } from '../types/providers';

import { CHAIN_EXPLORERS_BY_CHAIN_NAME } from '@/constants/chains';
import { TransferError } from '@/errors';
import { isTronAddress } from '@/utils/chains/isTronAddress';

const DEFAULT_TRON_RPC_URL = 'https://api.trongrid.io';
const DEFAULT_FEE_LIMIT = 100_000_000;

type TronRpcTransaction = Parameters<
  NonNullable<TronProvider['signTransaction']>
>[0] & { Error?: string };

type TronTriggerSmartContractResponse = {
  result?: {
    result?: boolean;
    message?: string;
  };
  transaction?: TronRpcTransaction;
};

type TronBroadcastResponse = {
  result?: boolean;
  txid?: string;
  message?: string;
};

const buildRpcUrl = (rpcUrl: string, endpoint: string) => {
  const baseUrl = rpcUrl.endsWith('/') ? rpcUrl : `${rpcUrl}/`;

  return new URL(endpoint.replace(/^\//, ''), baseUrl).toString();
};

const postTronRpc = async <T>(
  rpcUrl: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(buildRpcUrl(rpcUrl, endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Tron RPC request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

const tronAddressToHex = (address: string) => {
  if (address.startsWith('0x41') && address.length === 44) {
    return address.slice(2).toLowerCase();
  }

  if (address.startsWith('41') && address.length === 42) {
    return address.toLowerCase();
  }

  return hex.encode(base58.decode(address).slice(0, 21));
};

const getAbiAddressParam = (address: string) => {
  return tronAddressToHex(address).slice(2).padStart(64, '0');
};

const getAbiUint256Param = (value: bigint) => {
  return value.toString(16).padStart(64, '0');
};

export const useMakeTronTransfer = ({
  provider,
}: {
  provider?: TronProvider | null;
}) => {
  const make = async ({
    address: toAddress,
    amount,
    tokenAddress,
  }: MakeTransferArgs) => {
    if (!provider) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No Tron provider found.' },
      });
    }

    if (!provider.address) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No address found in Tron provider.' },
      });
    }

    if (!provider.request && !provider.signTransaction) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: {
          message: 'Tron provider does not support transaction signing.',
        },
      });
    }

    if (!isTronAddress(toAddress)) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: `Invalid Tron destination address: ${toAddress}` },
      });
    }

    const amountBigInt = BigInt(amount);

    if (amountBigInt <= 0n) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Transfer amount must be positive.' },
      });
    }

    const rpcUrl = DEFAULT_TRON_RPC_URL;
    const explorerBase =
      CHAIN_EXPLORERS_BY_CHAIN_NAME.tron ??
      'https://tronscan.org/#/transaction/';

    // Build unsigned transaction
    let unsignedTransaction: TronRpcTransaction;

    if (!tokenAddress) {
      const amountNumber = Number(amountBigInt);

      if (!Number.isSafeInteger(amountNumber)) {
        throw new TransferError({
          code: 'TRANSFER_INVALID_INITIAL',
          meta: { message: 'Tron transfer amount is too large.' },
        });
      }

      unsignedTransaction = await postTronRpc<TronRpcTransaction>(
        rpcUrl,
        '/wallet/createtransaction',
        {
          owner_address: tronAddressToHex(provider.address),
          to_address: tronAddressToHex(toAddress),
          amount: amountNumber,
        },
      );

      if (unsignedTransaction.Error ?? !unsignedTransaction.txID) {
        throw new TransferError({
          code: 'TRANSFER_INVALID_INITIAL',
          meta: { message: 'Insufficient TRX balance to cover network fee.' },
        });
      }
    } else {
      const response = await postTronRpc<TronTriggerSmartContractResponse>(
        rpcUrl,
        '/wallet/triggersmartcontract',
        {
          owner_address: tronAddressToHex(provider.address),
          contract_address: tronAddressToHex(tokenAddress),
          function_selector: 'transfer(address,uint256)',
          parameter: `${getAbiAddressParam(toAddress)}${getAbiUint256Param(amountBigInt)}`,
          fee_limit: DEFAULT_FEE_LIMIT,
          call_value: 0,
        },
      );

      if (!response.result?.result || !response.transaction) {
        throw new TransferError({
          code: 'EXTERNAL_TRANSFER_FAILED',
        });
      }

      unsignedTransaction = response.transaction;
    }

    let signedTransaction: TronRpcTransaction;

    // Primary path: sign via request (AppKit TronConnector)
    if (provider.request) {
      signedTransaction = (await provider.request({
        method: 'tron_sendTransaction',
        params: { transaction: unsignedTransaction as Record<string, unknown> },
      })) as TronRpcTransaction;
    } else {
      // Fallback path: sign via signTransaction (legacy wallets)
      signedTransaction = await provider.signTransaction!(unsignedTransaction);
    }

    const broadcastResult = await postTronRpc<TronBroadcastResponse>(
      rpcUrl,
      '/wallet/broadcasttransaction',
      signedTransaction as Record<string, unknown>,
    );

    if (!broadcastResult.result) {
      throw new TransferError({
        code: 'EXTERNAL_TRANSFER_FAILED',
      });
    }

    const hash = broadcastResult.txid ?? signedTransaction.txID;

    if (!hash) {
      throw new TransferError({
        code: 'EXTERNAL_TRANSFER_FAILED',
      });
    }

    return {
      hash,
      transactionLink: `${explorerBase}${hash}`,
    };
  };

  return { make };
};
