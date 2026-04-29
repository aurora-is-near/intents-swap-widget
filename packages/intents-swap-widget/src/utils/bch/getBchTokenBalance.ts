import { logger } from '../../logger';
import { Token } from '../../types';

type BlockchairAddressResponse = {
  data?: Record<string, { address?: { balance?: number | string } }> | null;
  context?: { code?: number; error?: string };
};

const BCH_API_BASE_URL = 'https://api.blockchair.com';

export const getBchTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string> => {
  if (token.symbol !== 'BCH') {
    logger.warn(`Attempted to fetch balance for unsupported BCH token: ${token.symbol}`);

    return '0';
  }

  const url = new URL(
    `/bitcoin-cash/dashboards/address/${encodeURIComponent(walletAddress)}`,
    BCH_API_BASE_URL
  );

  let res: Response;

  try {
    res = await fetch(url);
  } catch (err) {
    logger.error(err);

    return '0';
  }

  let data: BlockchairAddressResponse;

  try {
    data = (await res.json()) as BlockchairAddressResponse;
  } catch (err) {
    logger.error(err);

    return '0';
  }

  if (data.context?.code != null && data.context.code !== 200) {
    logger.warn(
      `Blockchair BCH error ${data.context.code}: ${data.context.error ?? 'unknown'}`,
    );

    return '0';
  }

  const balance = data.data?.[walletAddress]?.address?.balance;

  return balance == null ? '0' : balance.toString();
};
