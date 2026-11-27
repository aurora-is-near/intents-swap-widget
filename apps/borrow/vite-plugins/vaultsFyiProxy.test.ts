import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

import { vaultsFyiProxy } from './vaultsFyiProxy';

const ADDRESS = '0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611';

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;

/** The middleware the plugin registers on a dev or preview server. */
const middlewareOf = (
  plugin: Plugin,
  hook: 'configureServer' | 'configurePreviewServer',
): Middleware => {
  let registered: Middleware | undefined;
  const server = {
    middlewares: {
      use: (middleware: Middleware) => {
        registered = middleware;
      },
    },
  } as unknown as ViteDevServer & PreviewServer;

  (plugin[hook] as (target: ViteDevServer & PreviewServer) => void)(server);

  if (!registered) {
    throw new Error(`${hook} registered no middleware`);
  }

  return registered;
};

/** Runs the middleware and resolves with what it wrote, or `next`. */
const call = (middleware: Middleware, url: string, method = 'GET') =>
  new Promise<
    | { next: true }
    | {
        next: false;
        status: number;
        headers: Record<string, string>;
        body: string;
      }
  >((resolve, reject) => {
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 200,
      setHeader: (key: string, value: string) => {
        headers[key] = value;
      },
      end: (body: string) =>
        resolve({ next: false, status: res.statusCode, headers, body }),
    };

    middleware(
      { url, method } as IncomingMessage,
      res as unknown as ServerResponse,
      (error) => (error ? reject(error) : resolve({ next: true })),
    );
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('vaultsFyiProxy', () => {
  it('serves the proxy in dev and preview with the server-side key', async () => {
    const fetchStub = vi.fn<typeof fetch>(
      async () => new Response('{"data":[]}', { status: 200 }),
    );

    vi.stubGlobal('fetch', fetchStub);

    const plugin = vaultsFyiProxy({ VAULTS_FYI_API_KEY: 'vfyi-dev' });

    await Promise.all(
      (['configureServer', 'configurePreviewServer'] as const).map(
        async (hook) => {
          const result = await call(
            middlewareOf(plugin, hook),
            `/api/vaults-fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
          );

          expect(result).toMatchObject({
            next: false,
            status: 200,
            body: '{"data":[]}',
          });
        },
      ),
    );

    const [url, init] = fetchStub.mock.calls[0] ?? [];

    expect(String(url)).toBe(
      `https://api.vaults.fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
    );
    expect(new Headers(init?.headers).get('x-api-key')).toBe('vfyi-dev');
  });

  it('answers 503 without a key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await call(
      middlewareOf(vaultsFyiProxy({}), 'configureServer'),
      `/api/vaults-fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
    );

    expect(result).toMatchObject({ next: false, status: 503 });
  });

  it('passes other paths on', async () => {
    const middleware = middlewareOf(vaultsFyiProxy({}), 'configureServer');

    expect(await call(middleware, '/positions')).toEqual({ next: true });
    expect(await call(middleware, '/api/vaults-fyi-other')).toEqual({
      next: true,
    });
  });

  it('hands a failure to next', async () => {
    const middleware = middlewareOf(
      vaultsFyiProxy({ VAULTS_FYI_API_KEY: 'vfyi-dev' }),
      'configureServer',
    );

    await expect(
      call(
        middleware,
        `/api/vaults-fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
        'BAD METHOD',
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});
