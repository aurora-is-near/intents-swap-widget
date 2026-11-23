import { afterEach, describe, expect, it, vi } from 'vitest';

import handler, { config } from './intents-connect';

const BODY = JSON.stringify({ steps: [] });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api/intents-connect Edge Function', () => {
  it('runs on the edge runtime', () => {
    expect(config).toEqual({ runtime: 'edge' });
  });

  it('forwards a rewritten create call with the key from process.env', async () => {
    const fetchStub = vi.fn<typeof fetch>(
      async () => new Response('{"result":{}}', { status: 201 }),
    );

    vi.stubGlobal('fetch', fetchStub);
    vi.stubEnv('INTENTS_CONNECT_API_KEY', 'sk-edge');
    vi.stubEnv('INTENTS_CONNECT_API_URL', 'https://upstream.example');

    const response = await handler(
      new Request(
        'https://borrow.example/api/intents-connect?path=api/v1/executions/0xabc/steps',
        { method: 'POST', body: BODY },
      ),
    );

    expect(response.status).toBe(201);

    const [url, init] = fetchStub.mock.calls[0] ?? [];

    expect(String(url)).toBe(
      'https://upstream.example/api/v1/executions/0xabc/steps',
    );
    expect(new Headers(init?.headers).get('x-api-key')).toBe('sk-edge');
  });

  it('answers a generic 500 without the key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('INTENTS_CONNECT_API_KEY', '');

    const response = await handler(
      new Request(
        'https://borrow.example/api/intents-connect/api/v1/executions/0xabc',
        { method: 'POST', body: BODY },
      ),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
