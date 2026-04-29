import { logger } from '../../logger';
import { Token } from '../../types';

const ALEO_API_BASE_URL = 'https://api.explorer.provable.com/v1/mainnet';

export const getAleoTokenBalance = async (
  token: Token,
  walletAddress: string,
): Promise<string> => {
  // Only public ALEO credits are queryable; tokens like USAD/USDCx live in
  // private records that require a view key the widget doesn't have.
  if (token.symbol !== 'ALEO') {
    logger.warn(`Attempted to fetch balance for unsupported Aleo token: ${token.symbol}`);

    return '0';
  }

  const url = new URL(
    `/program/credits.aleo/mapping/account/${encodeURIComponent(walletAddress)}`,
    ALEO_API_BASE_URL
  );

  let res: Response;

  try {
    res = await fetch(url);
  } catch (err) {
    logger.error(err);

    return '0';
  }

  if (!res.ok) {
    logger.warn(`Aleo balance lookup failed: ${res.status}`);

    return '0';
  }

  let data;

  try {
    data = await res.json();
  } catch (err) {
    logger.error(err);

    return '0';
  }

  if (typeof data !== 'string') {
    logger.warn('Unexpected Aleo balance response format');

    return '0';
  }

  const numeric = data.replace(/[^0-9]/g, '');

  return numeric.length > 0 ? numeric : '0';
};
