import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '@/http';
import { IntentsApiError } from '@/errors';
import { createIntentsApi } from '@/intentsApi';
import type { OwnershipProof } from '@/ownership/types';

const respond = (
  body: unknown,
  { ok = true, status = 200 } = {},
): Awaited<ReturnType<FetchLike>> => ({
  ok,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const setup = (body: unknown, init?: { ok?: boolean; status?: number }) => {
  const fetchImpl = vi.fn<FetchLike>(async () => respond(body, init));
  const api = createIntentsApi({
    apiKey: 'key/1',
    baseUrl: 'https://intents.example.test/',
    fetch: fetchImpl,
  });

  const call = (index = 0) => {
    const [url, init_] = fetchImpl.mock.calls[index]!;

    return { url, ...init_ };
  };

  return { api, fetchImpl, call };
};

const PROOF: OwnershipProof = {
  standard: 'erc191',
  payload: '{"signer_id":"0xabc"}',
  signature: 'secp256k1:sig',
};

describe('createIntentsApi', () => {
  it('derives the NEAR RPC proxy URL from the base URL and encoded key', () => {
    const { api } = setup({});

    expect(api.nearRpcUrl).toBe('https://intents.example.test/rpc/key%2F1');
  });

  it('defaults to the production base URL', () => {
    const api = createIntentsApi({ apiKey: 'k' });

    expect(api.baseUrl).toBe('https://intents-api.aurora.dev');
    expect(api.nearRpcUrl).toBe('https://intents-api.aurora.dev/rpc/k');
  });

  it('reads tokens from the keyed path', async () => {
    const { api, call } = setup({ tokens: [], asset_stats: [] });

    await expect(api.getTokens()).resolves.toEqual({
      tokens: [],
      asset_stats: [],
    });
    expect(call().url).toBe('https://intents.example.test/api/tokens/key%2F1');
    expect(call().method).toBe('GET');
  });

  it('queries public intents balances by account id', async () => {
    const { api, call } = setup({ blockHeight: 1, balances: [] });

    await api.getIntentsAccountBalances('abc123');

    expect(call().url).toBe(
      'https://intents.example.test/api/intents-account/balances/key%2F1?intentsAccountId=abc123',
    );
  });

  it('wraps the proof as signedData when authenticating', async () => {
    const { api, call } = setup({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 3600,
      refreshExpiresIn: 2592000,
    });

    await api.authenticate(PROOF);

    expect(call().url).toBe(
      'https://intents.example.test/api/auth/authenticate/key%2F1',
    );
    expect(call().method).toBe('POST');
    expect(JSON.parse(call().body!)).toEqual({ signedData: PROOF });
  });

  it('posts the refresh token', async () => {
    const { api, call } = setup({ accessToken: 'a2', expiresIn: 3600 });

    await expect(api.refreshAccessToken('r')).resolves.toEqual({
      accessToken: 'a2',
      expiresIn: 3600,
    });
    expect(call().url).toBe(
      'https://intents.example.test/api/auth/refresh/key%2F1',
    );
    expect(JSON.parse(call().body!)).toEqual({ refreshToken: 'r' });
  });

  it('sends the session token as a Bearer header for confidential balances', async () => {
    const { api, call } = setup({ balances: [] });

    await api.getConfidentialBalances('tok', ['nep141:a', 'nep141:b']);

    expect(call().url).toBe(
      'https://intents.example.test/api/account/balances/key%2F1?tokenIds=nep141%3Aa%2Cnep141%3Ab',
    );
    expect(call().headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('omits tokenIds when none are requested', async () => {
    const { api, call } = setup({ balances: [] });

    await api.getConfidentialBalances('tok', []);

    expect(call().url).toBe(
      'https://intents.example.test/api/account/balances/key%2F1',
    );
  });
});

describe('errors', () => {
  it('uses the fee-service message rather than the reason phrase', async () => {
    const { api } = setup(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User session token is invalid or expired',
      },
      { ok: false, status: 401 },
    );

    const error = (await api
      .getConfidentialBalances('tok')
      .catch((e: unknown) => e)) as IntentsApiError;

    expect(error).toBeInstanceOf(IntentsApiError);
    expect(error.message).toBe('User session token is invalid or expired');
    expect(error.isUnauthorized).toBe(true);
    expect(error.isBadApiKey).toBe(false);
  });

  it('uses the 1Click pass-through message', async () => {
    const { api } = setup(
      { message: 'timestamp validation failed', correlationId: 'c' },
      { ok: false, status: 400 },
    );

    const error = (await api
      .authenticate(PROOF)
      .catch((e: unknown) => e)) as IntentsApiError;

    expect(error.message).toBe('timestamp validation failed');
    expect(error.status).toBe(400);
  });

  it('flags a bad API key and a rate limit', async () => {
    const notFound = setup({ message: 'nope' }, { ok: false, status: 404 });
    const limited = setup({ message: 'slow down' }, { ok: false, status: 429 });

    const a = (await notFound.api
      .getTokens()
      .catch((e: unknown) => e)) as IntentsApiError;

    const b = (await limited.api
      .getTokens()
      .catch((e: unknown) => e)) as IntentsApiError;

    expect(a.isBadApiKey).toBe(true);
    expect(b.isRateLimited).toBe(true);
  });

  it('reports the status for a non-JSON error body', async () => {
    const { api } = setup('<html>502</html>', { ok: false, status: 502 });

    const error = (await api
      .getTokens()
      .catch((e: unknown) => e)) as IntentsApiError;

    expect(error.status).toBe(502);
    expect(error.message).toContain('502');
    expect(error.body).toBe('<html>502</html>');
  });
});
