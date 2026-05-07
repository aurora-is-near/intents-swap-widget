import { Token } from '../../types';
import { isDashAddress } from '../chains/isDashAddress';

type BlockchairAddressResponse = {
  data?: Record<
    string,
    {
      address?: {
        balance?: number;
      };
    }
  >;
};

export const getDashTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string | null> => {
  if (!isDashAddress(walletAddress)) {
    return null;
  }

  // Dash has a single native asset; ignore any other "tokens" reported on the chain.
  if (token.symbol !== 'DASH') {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.blockchair.com/dash/dashboards/address/${walletAddress}?limit=0`,
    );

    const data = (await response.json()) as BlockchairAddressResponse;
    const balance = data.data?.[walletAddress]?.address?.balance;

    if (typeof balance !== 'number') {
      return '0';
    }

    return balance.toString();
  } catch {
    return null;
  }
};
