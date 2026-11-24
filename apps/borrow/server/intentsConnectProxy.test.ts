import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleIntentsConnectProxy,
  intentsConnectProxyOptions,
  MAX_BODY_BYTES,
  restoreRewrittenPath,
} from './intentsConnectProxy';

const API_KEY = 'sk-test-0123456789';
const UPSTREAM = 'https://upstream.example';
const OPTIONS = { apiKey: API_KEY, upstreamUrl: UPSTREAM };
const WALLET = '0x7a3f00000000000000000000000000000000009c21';
const BODY = JSON.stringify({ steps: [] });

const fetchStub = vi.fn<typeof fetch>();

const proxyRequest = (
  path: string,
  init: RequestInit = { method: 'POST', body: BODY },
) => new Request(`http://localhost/api/intents-connect${path}`, init);

const lastUpstreamCall = () => {
  const [input, init] = fetchStub.mock.calls.at(-1) ?? [];

  return {
    url: String(input),
    init,
    headers: new Headers(init?.headers),
  };
};

beforeEach(() => {
  fetchStub.mockReset();
  fetchStub.mockResolvedValue(
    new Response(JSON.stringify({ result: { id: 'exec-1' } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchStub);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('handleIntentsConnectProxy', () => {
  it.each([
    ['createExecution', `/api/v1/executions/${WALLET}`],
    ['createStepsExecution', `/api/v1/executions/${WALLET}/steps`],
  ])('adds x-api-key and forwards %s without the prefix', async (_, path) => {
    const response = await handleIntentsConnectProxy(
      proxyRequest(path),
      OPTIONS,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ result: { id: 'exec-1' } });
    expect(fetchStub).toHaveBeenCalledTimes(1);

    const { url, init, headers } = lastUpstreamCall();

    expect(url).toBe(`${UPSTREAM}${path}`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(BODY);
    expect(headers.get('x-api-key')).toBe(API_KEY);
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('keeps a path prefix on the upstream URL', async () => {
    await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`),
      { apiKey: API_KEY, upstreamUrl: `${UPSTREAM}/v2/` },
    );

    expect(lastUpstreamCall().url).toBe(
      `${UPSTREAM}/v2/api/v1/executions/${WALLET}`,
    );
  });

  it("forwards none of the client's headers and drops the query", async () => {
    await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}/steps?redirect=evil`, {
        method: 'POST',
        body: BODY,
        headers: {
          'x-api-key': 'client-key',
          cookie: 'session=secret',
          authorization: 'Bearer token',
        },
      }),
      OPTIONS,
    );

    const { url, headers } = lastUpstreamCall();

    expect(url).toBe(`${UPSTREAM}/api/v1/executions/${WALLET}/steps`);
    expect(headers.get('x-api-key')).toBe(API_KEY);
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
  });

  it.each([
    ['a path outside the prefix', 'http://localhost/api/v1/executions/0xabc'],
    ['the bare prefix', 'http://localhost/api/intents-connect'],
    ['the prefix root', 'http://localhost/api/intents-connect/'],
    [
      'a keyless API call',
      `http://localhost/api/intents-connect/api/v1/executions/${WALLET}/submit`,
    ],
    [
      'the deposit call',
      'http://localhost/api/intents-connect/api/v1/executions/deposit/submit',
    ],
    [
      'supported tokens',
      'http://localhost/api/intents-connect/api/v1/supported_tokens',
    ],
    [
      'an execution id',
      `http://localhost/api/intents-connect/api/v1/executions/${WALLET}/exec-1`,
    ],
    [
      'a path that climbs out',
      'http://localhost/api/intents-connect/api/v1/executions/%2E%2E/steps',
    ],
    ['another host path', 'http://localhost/api/intents-connect/admin'],
    [
      'an encoded slash that climbs out',
      'http://localhost/api/intents-connect/api/v1/executions/x%2F..%2F..%2Fadmin',
    ],
    [
      'an encoded backslash that climbs out',
      'http://localhost/api/intents-connect/api/v1/executions/x%5C..%5Cadmin',
    ],
    [
      'an encoded slash before steps',
      'http://localhost/api/intents-connect/api/v1/executions/x%2F..%2Fsupported_tokens/steps',
    ],
    [
      'a wallet that does not decode',
      'http://localhost/api/intents-connect/api/v1/executions/%E0%A4%A/steps',
    ],
  ])('answers 404 for %s', async (_, url) => {
    const response = await handleIntentsConnectProxy(
      new Request(url, { method: 'POST', body: BODY }),
      OPTIONS,
    );

    expect(response.status).toBe(404);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each(['GET', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'])(
    'answers 405 for %s on an allowed path',
    async (method) => {
      const response = await handleIntentsConnectProxy(
        proxyRequest(`/api/v1/executions/${WALLET}`, {
          method,
          body: method === 'GET' ? undefined : BODY,
        }),
        OPTIONS,
      );

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, ''])(
    'answers a generic 500 when the key is %j',
    async (apiKey) => {
      const response = await handleIntentsConnectProxy(
        proxyRequest(`/api/v1/executions/${WALLET}`),
        { apiKey, upstreamUrl: UPSTREAM },
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Internal server error',
      });
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it('answers a generic 500 when the upstream URL is not http(s)', async () => {
    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`),
      { apiKey: API_KEY, upstreamUrl: 'file:///etc' },
    );

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(API_KEY);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('refuses a body that is not JSON', async () => {
    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`, {
        method: 'POST',
        body: 'not json',
      }),
      OPTIONS,
    );

    expect(response.status).toBe(400);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('refuses a body over the limit', async () => {
    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`, {
        method: 'POST',
        body: JSON.stringify({ pad: 'x'.repeat(MAX_BODY_BYTES) }),
      }),
      OPTIONS,
    );

    expect(response.status).toBe(413);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('relays upstream errors with their status', async () => {
    fetchStub.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`),
      OPTIONS,
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Insufficient balance' });
  });

  it.each([204, 205, 304])(
    'relays an upstream %i without a body',
    async (status) => {
      fetchStub.mockResolvedValue(new Response(null, { status }));

      const response = await handleIntentsConnectProxy(
        proxyRequest(`/api/v1/executions/${WALLET}`),
        OPTIONS,
      );

      expect(response.status).toBe(status);
      expect(response.body).toBeNull();
    },
  );

  it('redacts the key if the upstream echoes it back', async () => {
    fetchStub.mockResolvedValue(
      new Response(JSON.stringify({ error: `Bad key ${API_KEY}` }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      }),
    );

    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`),
      OPTIONS,
    );

    const headers = [...response.headers.entries()].flat().join(' ');

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(API_KEY);
    expect(headers).not.toContain(API_KEY);
  });

  it('answers a generic 502 when the upstream call fails', async () => {
    fetchStub.mockRejectedValue(new TypeError(`fetch failed ${API_KEY}`));

    const response = await handleIntentsConnectProxy(
      proxyRequest(`/api/v1/executions/${WALLET}`),
      OPTIONS,
    );

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(API_KEY);
  });
});

describe('restoreRewrittenPath', () => {
  it('leaves a request on the full proxy path as it is', () => {
    const request = proxyRequest(`/api/v1/executions/${WALLET}`);

    expect(restoreRewrittenPath(request)).toBe(request);
  });

  it('puts back the path vercel.json moved into the query', async () => {
    const restored = restoreRewrittenPath(
      new Request(
        `http://localhost/api/intents-connect?path=api/v1/executions/${WALLET}/steps`,
        { method: 'POST', body: BODY },
      ),
    );

    expect(new URL(restored.url).pathname).toBe(
      `/api/intents-connect/api/v1/executions/${WALLET}/steps`,
    );

    const response = await handleIntentsConnectProxy(restored, OPTIONS);
    const { url, init, headers } = lastUpstreamCall();

    expect(response.status).toBe(201);
    expect(url).toBe(`${UPSTREAM}/api/v1/executions/${WALLET}/steps`);
    expect(init?.body).toBe(BODY);
    expect(headers.get('x-api-key')).toBe(API_KEY);
  });

  it.each([
    'api/v1/supported_tokens',
    'api/v1/executions/x%2F..%2F..%2Fadmin',
    'api/v1/executions/x/../../admin',
    '//evil.example/api/v1/executions/0xabc',
  ])('still applies the allow-list to path=%s', async (path) => {
    const response = await handleIntentsConnectProxy(
      restoreRewrittenPath(
        new Request(
          `http://localhost/api/intents-connect?path=${encodeURIComponent(path)}`,
          { method: 'POST', body: BODY },
        ),
      ),
      OPTIONS,
    );

    expect(response.status).toBe(404);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('leaves the request alone without a path parameter', async () => {
    const request = new Request('http://localhost/api/intents-connect', {
      method: 'POST',
      body: BODY,
    });

    expect(restoreRewrittenPath(request)).toBe(request);
    expect((await handleIntentsConnectProxy(request, OPTIONS)).status).toBe(
      404,
    );
  });
});

describe('intentsConnectProxyOptions', () => {
  it('reads the server-only key and upstream', () => {
    expect(
      intentsConnectProxyOptions({
        INTENTS_CONNECT_API_KEY: ` ${API_KEY} `,
        INTENTS_CONNECT_API_URL: UPSTREAM,
      }),
    ).toEqual({ apiKey: API_KEY, upstreamUrl: UPSTREAM });
  });

  it('ignores a VITE_ key and falls back to the client API URL', () => {
    expect(
      intentsConnectProxyOptions({
        VITE_INTENTS_CONNECT_API_KEY: API_KEY,
        VITE_INTENTS_CONNECT_API_URL: UPSTREAM,
      }),
    ).toEqual({ apiKey: undefined, upstreamUrl: UPSTREAM });
  });

  it('defaults the upstream to the alpha API', () => {
    expect(intentsConnectProxyOptions({}).upstreamUrl).toBe(
      'https://intents-connect-alpha-api.aurora.dev',
    );
  });
});
