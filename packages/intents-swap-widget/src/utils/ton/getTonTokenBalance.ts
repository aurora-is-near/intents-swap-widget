import { Token } from '../../types';

export const getTonTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string | null> => {
  if (token.symbol !== 'TON') {
    return null;
  }

  const url = new URL('https://toncenter.com/api/v2/getAddressBalance');

  url.searchParams.append('address', walletAddress);

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = (await res.json()) as {
    ok: boolean;
    result?: string;
    error?: string;
    code?: number;
  };

  return data.result ?? '0'; // nanotons
};
