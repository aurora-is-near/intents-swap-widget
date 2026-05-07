import { Token } from '../../types';
import { isBchAddress } from '../chains/isBchAddress';

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

const stripCashAddrPrefix = (address: string) =>
  address.toLowerCase().startsWith('bitcoincash:')
    ? address.slice('bitcoincash:'.length)
    : address;

export const getBchTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string | null> => {
  if (!isBchAddress(walletAddress)) {
    return null;
  }

  if (token.symbol !== 'BCH') {
    return null;
  }

  // Blockchair keys responses by the queried address form, so use the same
  // (prefix-stripped) form for both the request URL and the lookup.
  const queryAddress = stripCashAddrPrefix(walletAddress);

  try {
    const response = await fetch(
      `https://api.blockchair.com/bitcoin-cash/dashboards/address/${queryAddress}?limit=0`,
    );

    const data = (await response.json()) as BlockchairAddressResponse;
    const balance = data.data?.[queryAddress]?.address?.balance;

    if (typeof balance !== 'number') {
      return '0';
    }

    return balance.toString();
  } catch {
    return null;
  }
};
