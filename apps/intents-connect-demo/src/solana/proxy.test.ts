// @vitest-environment node
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleSolanaRpc, solanaProxy } from '../../solanaProxy';

const callProxy = async (
  env: Record<string, string>,
  url: string,
  method: string,
  body = '',
) => {
  let middleware: (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => Promise<void> = async () => undefined;

  const plugin = solanaProxy(env);
  const server = {
    middlewares: {
      use: (fn: typeof middleware) => {
        middleware = fn;
      },
    },
  };

  (plugin.configureServer as (viteServer: ViteDevServer) => void)(
    server as unknown as ViteDevServer,
  );
  const req = Object.assign(Readable.from([body]), {
    url,
    method,
    headers: { 'x-api-key': 'untrusted-browser-key' },
  });

  const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  const next = vi.fn();

  await middleware(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse,
    next,
  );

  return { res, next };
};

afterEach(() => vi.unstubAllGlobals());

describe('demo Solana proxies', () => {
  it('uses only the server key and the fixed Jupiter upstream', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));

    vi.stubGlobal('fetch', fetcher);
    const { res } = await callProxy(
      { JUPITER_API_KEY: 'server-key' },
      '/api/jupiter/swap/v2/build?amount=10',
      'GET',
    );

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.jup.ag/swap/v2/build?amount=10',
      expect.objectContaining({ headers: { 'x-api-key': 'server-key' } }),
    );
    expect(res.end).toHaveBeenCalledWith('{}');
  });

  it('reports a missing key without contacting Jupiter', async () => {
    const fetcher = vi.fn();

    vi.stubGlobal('fetch', fetcher);
    const { res } = await callProxy({}, '/api/jupiter/swap/v2/build', 'GET');

    expect(res.statusCode).toBe(503);
    expect(res.end).toHaveBeenCalledWith(
      expect.stringContaining('JUPITER_API_KEY'),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('allows account reads and refuses transaction broadcasts', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));

    vi.stubGlobal('fetch', fetcher);
    const read = await callProxy(
      {},
      '/api/solana-rpc',
      'POST',
      JSON.stringify({ method: 'getMultipleAccounts' }),
    );

    const write = await callProxy(
      {},
      '/api/solana-rpc',
      'POST',
      JSON.stringify({ method: 'sendTransaction' }),
    );

    expect(read.res.statusCode).toBe(200);
    expect(write.res.statusCode).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves the Vercel function path with a web Request', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"result":1}', { status: 200 }));

    vi.stubGlobal('fetch', fetcher);

    const response = await handleSolanaRpc(
      new Request('https://demo.example/api/solana-rpc', {
        method: 'POST',
        headers: { 'x-api-key': 'untrusted-browser-key' },
        body: JSON.stringify({ method: 'getMultipleAccounts' }),
      }),
      { SOLANA_RPC_URL: 'https://rpc.example' },
    );

    expect(fetcher).toHaveBeenCalledWith(
      'https://rpc.example',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"result":1}');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(
      (
        await handleSolanaRpc(
          new Request('https://demo.example/api/solana-rpc', {
            method: 'POST',
            body: 'not json',
          }),
          {},
        )
      ).status,
    ).toBe(400);
  });

  it('passes unrelated routes through and limits methods and request sizes', async () => {
    expect(
      (await callProxy({}, '/some-other-page', 'GET')).next,
    ).toHaveBeenCalledTimes(1);
    expect((await callProxy({}, '/api/solana-rpc', 'GET')).res.statusCode).toBe(
      405,
    );
    expect(
      (await callProxy({}, '/api/solana-rpc', 'POST', 'x'.repeat(65_537))).res
        .statusCode,
    ).toBe(413);
  });
});
