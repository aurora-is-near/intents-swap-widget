import { afterEach, describe, expect, it, vi } from 'vitest';

import handler, { config } from '../api/vaults-fyi';

const ADDRESS = '0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api/vaults-fyi Edge Function', () => {
  it('runs on the edge runtime', () => {
    expect(config).toEqual({ runtime: 'edge' });
  });

  it('forwards a rewritten positions call with the key from process.env', async () => {
    const fetchStub = vi.fn<typeof fetch>(
      async () => new Response('{"data":[]}', { status: 200 }),
    );

    vi.stubGlobal('fetch', fetchStub);
    vi.stubEnv('VAULTS_FYI_API_KEY', 'vfyi-edge');
    vi.stubEnv('VAULTS_FYI_API_URL', 'https://upstream.example');

    const response = await handler(
      new Request(
        `https://borrow.example/api/vaults-fyi?path=beta/borrow/portfolio/positions/${ADDRESS}&allowedNetworks=base`,
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('vfyi-edge');

    const [url, init] = fetchStub.mock.calls[0] ?? [];

    expect(String(url)).toBe(
      `https://upstream.example/beta/borrow/portfolio/positions/${ADDRESS}`,
    );
    expect(new Headers(init?.headers).get('x-api-key')).toBe('vfyi-edge');
  });

  it('answers 503 with a JSON error without the key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('VAULTS_FYI_API_KEY', '');

    const response = await handler(
      new Request(
        `https://borrow.example/api/vaults-fyi/beta/borrow/portfolio/positions/${ADDRESS}`,
      ),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'vaults.fyi is not configured on this server',
    });
  });
});
