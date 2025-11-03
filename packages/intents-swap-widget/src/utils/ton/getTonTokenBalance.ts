import { Token } from '../../types';

export const getTonTokenBalance = async (
  token: Token,
  walletAddress: string,
  tonCenterApiKey?: string,
): Promise<string | null> => {
  if (token.symbol !== 'TON') {
    return null;
  }

  const url = new URL('https://toncenter.com/api/v2/getAddressBalance');

  url.searchParams.append('address', walletAddress);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (tonCenterApiKey) {
    headers['X-API-Key'] = tonCenterApiKey;
  }

  const res = await fetch(url, { headers });

  const data = (await res.json()) as {
    ok: boolean;
    result?: string;
    error?: string;
    code?: number;
  };

  return data.result ?? '0'; // nanotons
};
