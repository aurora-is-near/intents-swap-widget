import { logger } from '../../logger';
import { Token } from '../../types';

type BlockchairAddressResponse = {
  data?: Record<string, { address?: { balance?: number | string } }> | null;
  context?: { code?: number; error?: string };
};

const DASH_API_BASE_URL = 'https://api.blockchair.com';

export const getDashTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string> => {
  if (token.symbol !== 'DASH') {
    logger.warn(
      `Attempted to fetch balance for unsupported Dash token: ${token.symbol}`,
    );

    return '0';
  }

  const url = new URL(
    `/dash/dashboards/address/${encodeURIComponent(walletAddress)}`,
    DASH_API_BASE_URL,
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
      `Blockchair Dash error ${data.context.code}: ${data.context.error ?? 'unknown'}`,
    );

    return '0';
  }

  const balance = data.data?.[walletAddress]?.address?.balance;

  return balance == null ? '0' : balance.toString();
};
