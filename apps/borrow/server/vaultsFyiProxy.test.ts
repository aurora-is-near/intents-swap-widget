import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CACHE_S_MAXAGE,
  handleVaultsFyiProxy,
  restoreRewrittenPath,
  vaultsFyiProxyOptions,
} from './vaultsFyiProxy';

const API_KEY = 'vfyi-test-0123456789';
const UPSTREAM = 'https://upstream.example';
const OPTIONS = { apiKey: API_KEY, upstreamUrl: UPSTREAM };
const ADDRESS = '0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611';
const MARKET = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const PROXY = 'http://localhost/api/vaults-fyi';

const fetchStub = vi.fn<typeof fetch>();

const proxyRequest = (path: string, init: RequestInit = { method: 'GET' }) =>
  new Request(`${PROXY}${path}`, init);

const lastUpstreamCall = () => {
  const [input, init] = fetchStub.mock.calls.at(-1) ?? [];

  return { url: String(input), init, headers: new Headers(init?.headers) };
};

const allHeaders = (response: Response) =>
  [...response.headers.entries()].flat().join(' ');

beforeEach(() => {
  fetchStub.mockReset();
  fetchStub.mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
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

describe('handleVaultsFyiProxy', () => {
  it.each([
    ['wallet-wide positions', `/beta/borrow/portfolio/positions/${ADDRESS}`],
    [
      'a lower-case address',
      `/beta/borrow/portfolio/positions/${ADDRESS.toLowerCase()}`,
    ],
    [
      'one market position',
      `/beta/borrow/portfolio/positions/${ADDRESS}/base/${MARKET}`,
    ],
    ['the markets of a network', '/beta/borrow/markets/arbitrum'],
    ['one market', `/beta/borrow/markets/base/${MARKET}`],
    [
      'a market id that is not an address',
      '/beta/borrow/markets/base/aave-v3.core',
    ],
  ])('adds x-api-key and forwards %s', async (_, path) => {
    const response = await handleVaultsFyiProxy(proxyRequest(path), OPTIONS);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [] });
    expect(fetchStub).toHaveBeenCalledTimes(1);

    const { url, init, headers } = lastUpstreamCall();

    expect(url).toBe(`${UPSTREAM}${path}`);
    expect(init?.method).toBe('GET');
    expect(headers.get('x-api-key')).toBe(API_KEY);
  });

  it('caches a success briefly on the CDN', async () => {
    const response = await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
      OPTIONS,
    );

    expect(response.headers.get('Cache-Control')).toContain(
      `s-maxage=${CACHE_S_MAXAGE}`,
    );
  });

  it('keeps a path prefix on the upstream URL', async () => {
    await handleVaultsFyiProxy(proxyRequest('/beta/borrow/markets/base'), {
      apiKey: API_KEY,
      upstreamUrl: `${UPSTREAM}/v9/`,
    });

    expect(lastUpstreamCall().url).toBe(
      `${UPSTREAM}/v9/beta/borrow/markets/base`,
    );
  });

  it('passes the documented query parameters and drops the rest', async () => {
    await handleVaultsFyiProxy(
      proxyRequest(
        `/beta/borrow/portfolio/positions/${ADDRESS}?allowedNetworks=base&allowedNetworks=arbitrum&disallowedNetworks=mainnet&allowedAssets=USDC&disallowedAssets=DAI&minUsdAssetValueThreshold=1&sortBy=debt&sortOrder=desc&apiKey=x&path=/admin&redirect=evil`,
      ),
      OPTIONS,
    );

    const url = new URL(lastUpstreamCall().url);

    expect(url.pathname).toBe(`/beta/borrow/portfolio/positions/${ADDRESS}`);
    expect([...url.searchParams.entries()]).toEqual([
      ['allowedNetworks', 'base'],
      ['allowedNetworks', 'arbitrum'],
      ['disallowedNetworks', 'mainnet'],
      ['allowedAssets', 'USDC'],
      ['disallowedAssets', 'DAI'],
      ['minUsdAssetValueThreshold', '1'],
      ['sortBy', 'debt'],
      ['sortOrder', 'desc'],
    ]);
  });

  it("forwards none of the client's headers", async () => {
    await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`, {
        method: 'GET',
        headers: {
          'x-api-key': 'client-key',
          cookie: 'session=secret',
          authorization: 'Bearer token',
        },
      }),
      OPTIONS,
    );

    const { headers } = lastUpstreamCall();

    expect(headers.get('x-api-key')).toBe(API_KEY);
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
  });

  it.each([
    ['a path outside the prefix', 'http://localhost/beta/borrow/markets/base'],
    ['the bare prefix', PROXY],
    ['the prefix root', `${PROXY}/`],
    ['another API path', `${PROXY}/v2/portfolio/positions/${ADDRESS}`],
    ['the borrow root', `${PROXY}/beta/borrow`],
    [
      'positions without an address',
      `${PROXY}/beta/borrow/portfolio/positions`,
    ],
    ['a short address', `${PROXY}/beta/borrow/portfolio/positions/0x1959`],
    [
      'an address without 0x',
      `${PROXY}/beta/borrow/portfolio/positions/${ADDRESS.slice(2)}00`,
    ],
    [
      'a non-hex address',
      `${PROXY}/beta/borrow/portfolio/positions/0x${'g'.repeat(40)}`,
    ],
    ['an ENS name', `${PROXY}/beta/borrow/portfolio/positions/vitalik.eth`],
    [
      'a network without a market',
      `${PROXY}/beta/borrow/portfolio/positions/${ADDRESS}/base`,
    ],
    [
      'an extra segment on a position',
      `${PROXY}/beta/borrow/portfolio/positions/${ADDRESS}/base/${MARKET}/x`,
    ],
    [
      'an extra segment on a market',
      `${PROXY}/beta/borrow/markets/base/${MARKET}/x`,
    ],
    ['a trailing slash', `${PROXY}/beta/borrow/markets/base/`],
    ['the transactions API', `${PROXY}/beta/borrow/transactions/base`],
    ['an encoded slash', `${PROXY}/beta/borrow/markets/base/x%2F..%2Fadmin`],
    ['an encoded backslash', `${PROXY}/beta/borrow/markets/base/x%5Cadmin`],
    ['an encoded dot segment', `${PROXY}/beta/borrow/markets/%2E%2E/admin`],
    ['a dot market id', `${PROXY}/beta/borrow/markets/base/.x`],
    ['a network with a space', `${PROXY}/beta/borrow/markets/ba%20se`],
    [
      'a path that climbs out',
      `${PROXY}/beta/borrow/markets/base/../../../admin`,
    ],
    [
      'a long market id',
      `${PROXY}/beta/borrow/markets/base/${'a'.repeat(129)}`,
    ],
  ])('answers 404 for %s', async (_, url) => {
    const response = await handleVaultsFyiProxy(new Request(url), OPTIONS);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])(
    'answers 405 for %s on an allowed path',
    async (method) => {
      const response = await handleVaultsFyiProxy(
        proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`, {
          method,
        }),
        OPTIONS,
      );

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET');
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, ''])('answers 503 when the key is %j', async (apiKey) => {
    const response = await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
      { apiKey, upstreamUrl: UPSTREAM },
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      error: 'vaults.fyi is not configured on this server',
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each(['file:///etc', 'http://upstream.example', 'not a url'])(
    'answers a generic 500 without sending the key when the upstream URL is %s',
    async (upstreamUrl) => {
      const response = await handleVaultsFyiProxy(
        proxyRequest('/beta/borrow/markets/base'),
        { apiKey: API_KEY, upstreamUrl },
      );

      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain(API_KEY);
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it.each([
    [401, { error: 'Unauthorized' }],
    [404, { error: 'Market not found' }],
    [429, { error: 'Rate limit exceeded' }],
    [500, { message: 'Internal error' }],
  ])(
    'forwards an upstream %i with its body, uncached',
    async (status, body) => {
      fetchStub.mockResolvedValue(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await handleVaultsFyiProxy(
        proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
        OPTIONS,
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(body);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    },
  );

  it('forwards an upstream 204 without a body', async () => {
    fetchStub.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await handleVaultsFyiProxy(
      proxyRequest('/beta/borrow/markets/base'),
      OPTIONS,
    );

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('never returns the key, even when the upstream echoes it', async () => {
    fetchStub.mockResolvedValue(
      new Response(JSON.stringify({ error: `Bad key ${API_KEY}` }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'set-cookie': `k=${API_KEY}`,
        },
      }),
    );

    const response = await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
      OPTIONS,
    );

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(API_KEY);
    expect(allHeaders(response)).not.toContain(API_KEY);
  });

  it('keeps the key out of a successful response', async () => {
    const response = await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
      OPTIONS,
    );

    expect(await response.text()).not.toContain(API_KEY);
    expect(allHeaders(response)).not.toContain(API_KEY);
  });

  it('answers a generic 502 when the upstream call fails', async () => {
    fetchStub.mockRejectedValue(new TypeError('fetch failed'));

    const response = await handleVaultsFyiProxy(
      proxyRequest(`/beta/borrow/portfolio/positions/${ADDRESS}`),
      OPTIONS,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Upstream request failed' });
  });
});

describe('restoreRewrittenPath', () => {
  it('leaves a request on the full proxy path as it is', () => {
    const request = proxyRequest('/beta/borrow/markets/base');

    expect(restoreRewrittenPath(request)).toBe(request);
  });

  it('puts back the path and keeps the other query parameters', async () => {
    const restored = restoreRewrittenPath(
      new Request(
        `${PROXY}?path=beta/borrow/portfolio/positions/${ADDRESS}&sortBy=debt`,
      ),
    );

    const url = new URL(restored.url);

    expect(url.pathname).toBe(
      `/api/vaults-fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
    );
    expect(url.search).toBe('?sortBy=debt');

    const response = await handleVaultsFyiProxy(restored, OPTIONS);

    expect(response.status).toBe(200);
    expect(lastUpstreamCall().url).toBe(
      `${UPSTREAM}/beta/borrow/portfolio/positions/${ADDRESS}?sortBy=debt`,
    );
  });

  it('keeps the method, so a rewritten POST is still refused', async () => {
    const response = await handleVaultsFyiProxy(
      restoreRewrittenPath(
        new Request(`${PROXY}?path=beta/borrow/markets/base`, {
          method: 'POST',
          body: '{}',
        }),
      ),
      OPTIONS,
    );

    expect(response.status).toBe(405);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each([
    'v2/portfolio/positions/0xabc',
    'beta/borrow/markets/base/x%2F..%2Fadmin',
    'beta/borrow/markets/base/../../admin',
    '//evil.example/beta/borrow/markets/base',
  ])('still applies the allow-list to path=%s', async (path) => {
    const response = await handleVaultsFyiProxy(
      restoreRewrittenPath(
        new Request(`${PROXY}?path=${encodeURIComponent(path)}`),
      ),
      OPTIONS,
    );

    expect(response.status).toBe(404);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('leaves the request alone without a path parameter', async () => {
    const request = new Request(PROXY);

    expect(restoreRewrittenPath(request)).toBe(request);
    expect((await handleVaultsFyiProxy(request, OPTIONS)).status).toBe(404);
  });
});

describe('vaultsFyiProxyOptions', () => {
  it('reads the server-only key and upstream', () => {
    expect(
      vaultsFyiProxyOptions({
        VAULTS_FYI_API_KEY: ` ${API_KEY} `,
        VAULTS_FYI_API_URL: UPSTREAM,
      }),
    ).toEqual({ apiKey: API_KEY, upstreamUrl: UPSTREAM });
  });

  it('ignores a VITE_ key and defaults the upstream', () => {
    expect(vaultsFyiProxyOptions({ VITE_VAULTS_FYI_API_KEY: API_KEY })).toEqual(
      { apiKey: undefined, upstreamUrl: 'https://api.vaults.fyi' },
    );
  });
});
