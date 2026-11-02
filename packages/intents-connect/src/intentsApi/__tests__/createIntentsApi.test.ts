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

  it('posts a quote request as-is', async () => {
    const { api, call } = setup({ quote: { depositAddress: 'dep' } });
    const body = {
      dry: false,
      swapType: 'EXACT_INPUT' as const,
      slippageTolerance: 100,
      originAsset: 'nep141:usdc.near',
      depositType: 'INTENTS' as const,
      destinationAsset: 'nep245:monad-usdc',
      amount: '1000000',
      refundTo: '0xabc',
      refundType: 'INTENTS' as const,
      recipient: '0xintermediary',
      recipientType: 'DESTINATION_CHAIN' as const,
      deadline: '2026-11-02T12:00:00.000Z',
    };

    await api.getQuote(body);

    expect(call().url).toBe('https://intents.example.test/api/quote/key%2F1');
    expect(call().method).toBe('POST');
    expect(JSON.parse(call().body!)).toEqual(body);
  });

  it('generates and submits a swap transfer intent, with a token only when given', async () => {
    const { api, call } = setup({ intentHash: 'h', correlationId: 'c' });
    const generate = {
      type: 'swap_transfer' as const,
      standard: 'erc191' as const,
      signerId: '0xabc',
      depositAddress: 'dep',
    };

    await api.generateIntent(generate);
    await api.submitIntent(
      { type: 'swap_transfer', signedData: PROOF },
      { accessToken: 'tok' },
    );

    expect(call(0).url).toBe(
      'https://intents.example.test/api/generate-intent/key%2F1',
    );
    expect(JSON.parse(call(0).body!)).toEqual(generate);
    expect(call(0).headers).not.toHaveProperty('Authorization');
    expect(call(1).url).toBe(
      'https://intents.example.test/api/submit-intent/key%2F1',
    );
    expect(JSON.parse(call(1).body!)).toEqual({
      type: 'swap_transfer',
      signedData: PROOF,
    });
    expect(call(1).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('reads swap status by deposit address and memo', async () => {
    const { api, call } = setup({ status: 'PROCESSING' });

    await expect(
      api.getSwapStatus({ depositAddress: 'dep 1', depositMemo: 'm' }),
    ).resolves.toEqual({ status: 'PROCESSING' });

    await api.getSwapStatus({ depositAddress: 'dep' }, { accessToken: 'tok' });

    expect(call(0).url).toBe(
      'https://intents.example.test/api/status/key%2F1?depositAddress=dep+1&depositMemo=m',
    );
    expect(call(1).url).toBe(
      'https://intents.example.test/api/status/key%2F1?depositAddress=dep',
    );
    expect(call(1).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it("surfaces 1Click's message on a rejected intent", async () => {
    const { api } = setup(
      { message: 'Quote expired', correlationId: 'c' },
      { ok: false, status: 400 },
    );

    await expect(
      api.generateIntent({
        type: 'swap_transfer',
        standard: 'erc191',
        signerId: '0xabc',
        depositAddress: 'dep',
      }),
    ).rejects.toMatchObject({ message: 'Quote expired', status: 400 });
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
