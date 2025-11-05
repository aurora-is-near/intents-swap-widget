import { Token } from '../../types';
import { isTonAddress } from './isTonAddress';

type TonJettonWallet = {
  address: string;
  balance: string;
  owner: string;
  jetton: string;
};

type TonJettonWalletsResponse = {
  jetton_wallets?: TonJettonWallet[];
  address_book?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type GetAddressBalanaceResponse = {
  ok: boolean;
  result?: string;
  error?: string;
  code?: number;
};

const getNativeTonBalance = async (
  token: Token,
  walletAddress: string,
  tonCenterApiKey?: string,
): Promise<string | null> => {
  if (token.symbol !== 'TON') {
    return null;
  }

  const url = new URL('https://toncenter.com/api/v2/getAddressBalance');

  url.searchParams.set('address', walletAddress);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (tonCenterApiKey) {
    headers['X-API-Key'] = tonCenterApiKey;
  }

  const res = await fetch(url, { headers });

  const data = (await res.json()) as GetAddressBalanaceResponse;

  return data.result ?? '0';
};

const getTonJettonBalance = async (
  token: Token,
  walletAddress: string,
  tonCenterApiKey?: string,
): Promise<string | null> => {
  const url = new URL('https://toncenter.com/api/v3/jetton/wallets');

  if (!token.contractAddress) {
    return null;
  }

  url.searchParams.set('owner_address', walletAddress);
  url.searchParams.set('jetton_address', token.contractAddress);
  url.searchParams.set('exclude_zero_balance', 'false');

  const headers: HeadersInit = {};

  if (tonCenterApiKey) {
    headers['X-Api-Key'] = tonCenterApiKey;
  }

  const res = await fetch(url.toString(), { headers });
  const data = (await res.json()) as TonJettonWalletsResponse;

  if (!data.jetton_wallets?.length) {
    return '0';
  }

  const wallet = data.jetton_wallets?.[0];

  return wallet?.balance ?? '0';
};

export const getTonTokenBalance = (
  token: Token,
  walletAddress: string,
  tonCenterApiKey?: string,
): Promise<string | null> | string => {
  if (!isTonAddress(walletAddress)) {
    return '0';
  }

  if (token.symbol === 'TON') {
    return getNativeTonBalance(token, walletAddress, tonCenterApiKey);
  }

  return getTonJettonBalance(token, walletAddress, tonCenterApiKey);
};
