import { base58, hex } from '@scure/base';

import { isTronAddress } from '../chains/isTronAddress';

import type { Token } from '@/types/token';

type TronAccountResponse = {
  balance?: number;
};

type TronTriggerConstantContractResponse = {
  constant_result?: string[];
};

const DEFAULT_TRON_RPC_URL = 'https://api.trongrid.io';

const getRpcUrls = (rpcUrls: string[]) => {
  return rpcUrls.length > 0 ? rpcUrls : [DEFAULT_TRON_RPC_URL];
};

const buildRpcUrl = (rpcUrl: string, endpoint: string) => {
  const baseUrl = rpcUrl.endsWith('/') ? rpcUrl : `${rpcUrl}/`;

  return new URL(endpoint.replace(/^\//, ''), baseUrl).toString();
};

const TRON_RPC_TIMEOUT_MS = 10_000;

const postTronRpc = async <T>(
  rpcUrls: string[],
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> => {
  let lastError: unknown;

  // eslint-disable-next-line no-restricted-syntax
  for (const rpcUrl of getRpcUrls(rpcUrls)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRON_RPC_TIMEOUT_MS);
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(buildRpcUrl(rpcUrl, endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Tron RPC request failed with status ${response.status}`,
        );
      }

      // eslint-disable-next-line no-await-in-loop
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All Tron RPC requests failed');
};

  throw lastError instanceof Error
    ? lastError
    : new Error('All Tron RPC requests failed');
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

const getNativeTrxBalance = async (
  walletAddress: string,
  rpcUrls: string[],
): Promise<string> => {
  const response = await postTronRpc<TronAccountResponse>(
    rpcUrls,
    '/wallet/getaccount',
    {
      address: walletAddress,
      visible: true,
    },
  );

  return `${response.balance ?? 0}`;
};

const getTrc20Balance = async (
  token: Token,
  walletAddress: string,
  rpcUrls: string[],
): Promise<string> => {
  if (!token.contractAddress) {
    return '0';
  }

  const response = await postTronRpc<TronTriggerConstantContractResponse>(
    rpcUrls,
    '/wallet/triggerconstantcontract',
    {
      owner_address: tronAddressToHex(walletAddress),
      contract_address: tronAddressToHex(token.contractAddress),
      function_selector: 'balanceOf(address)',
      parameter: tronAddressToHex(walletAddress).slice(2).padStart(64, '0'),
      visible: false,
    },
  );

  const [balanceHex] = response.constant_result ?? [];

  return balanceHex ? BigInt(`0x${balanceHex}`).toString() : '0';
};

export const getTronTokenBalance = async (
  token: Token,
  walletAddress: string,
  rpcUrls: string[],
): Promise<string> => {
  if (!isTronAddress(walletAddress)) {
    return '0';
  }

  if (!token.contractAddress || token.symbol === 'TRX') {
    return getNativeTrxBalance(walletAddress, rpcUrls);
  }

  return getTrc20Balance(token, walletAddress, rpcUrls);
};
