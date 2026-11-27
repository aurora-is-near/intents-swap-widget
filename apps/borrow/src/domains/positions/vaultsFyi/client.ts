import { VAULTS_FYI_PROXY_PATH } from '@/constants';

import { VaultsFyiReadError } from './guards';

/** The error's own words from a JSON error body, when it has them. */
const messageOf = (body: string): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(body);

    if (typeof parsed === 'object' && parsed !== null) {
      const { message, error } = parsed as Record<string, unknown>;
      const text = typeof message === 'string' ? message : error;

      return typeof text === 'string' && text !== '' ? text : undefined;
    }
  } catch {
    // Not JSON: the status says enough.
  }

  return undefined;
};

/**
 * GETs `path` under the borrow API through the proxy and returns the parsed
 * JSON. A failed call or a non-JSON answer throws `VaultsFyiReadError`.
 */
export const getVaultsFyi = async (path: string): Promise<unknown> => {
  let response: Response;
  let body: string;

  try {
    // Same-origin through the key proxy (vite dev and preview, the Vercel
    // Edge Function), under the Beta borrow API it allow-lists.
    response = await fetch(`${VAULTS_FYI_PROXY_PATH}/beta/borrow${path}`, {
      headers: { Accept: 'application/json' },
    });
    body = await response.text();
  } catch (error) {
    throw new VaultsFyiReadError('vaults.fyi could not be reached', {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new VaultsFyiReadError(
      messageOf(body) ?? `vaults.fyi answered ${response.status}`,
      { status: response.status },
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new VaultsFyiReadError('vaults.fyi answered something not JSON', {
      cause: error,
    });
  }
};
