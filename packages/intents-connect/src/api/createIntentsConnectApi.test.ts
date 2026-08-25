import { describe, expect, it, vi } from 'vitest';

import { createIntentsConnectApi, type FetchLike } from '@/api';
import { IntentsConnectApiError, IntentsConnectError } from '@/errors';

const BASE = 'https://api.example.test';

const respond = (
  body: string,
  { ok = true, status = 200 } = {},
): Awaited<ReturnType<FetchLike>> => ({
  ok,
  status,
  text: async () => body,
});

const apiWith = (fetchImpl: FetchLike) =>
  createIntentsConnectApi({ baseUrl: BASE, apiKey: 'key', fetch: fetchImpl });

describe('error responses', () => {
  it('reports the status for a non-JSON error body instead of a parse error', async () => {
    // A proxy returning an HTML 502 used to throw SyntaxError before the status
    // check could run, hiding the status entirely.
    const api = apiWith(async () =>
      respond('<html><body>502 Bad Gateway</body></html>', {
        ok: false,
        status: 502,
      }),
    );

    const error = await api.listExecutions('0xabc').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(IntentsConnectApiError);
    expect((error as IntentsConnectApiError).status).toBe(502);
    expect((error as Error).message).toContain('502');
    expect((error as Error).message).toContain('Bad Gateway');
  });

  it('keeps isExecutionInFlight usable for a 409 with a non-JSON body', async () => {
    const api = apiWith(async () =>
      respond('plain text conflict', { ok: false, status: 409 }),
    );

    const error = (await api
      .createExecution('0xabc', {
        version: '1.0',
        type: 'evm',
        quote: {
          originAsset: 'a',
          destinationAsset: 'b',
          amount: '1',
          swapType: 'EXACT_INPUT',
          slippageTolerance: 100,
        },
        steps: [],
        metadata: { title: 't', intent: 'i' },
        dry: false,
      })
      .catch((e: unknown) => e)) as IntentsConnectApiError;

    expect(error.isExecutionInFlight).toBe(true);
  });

  it('still prefers the API error field when the body is JSON', async () => {
    const api = apiWith(async () =>
      respond(JSON.stringify({ error: 'steps are required' }), {
        ok: false,
        status: 400,
      }),
    );

    await expect(api.listExecutions('0xabc')).rejects.toThrow(
      'steps are required',
    );
  });

  it('reports a non-JSON body on an otherwise OK response', async () => {
    const api = apiWith(async () => respond('<html>not json</html>'));

    await expect(api.listExecutions('0xabc')).rejects.toThrow(/non-JSON body/);
  });
});

describe('timeout', () => {
  it('applies to the body read, not just the headers', async () => {
    // The old implementation cleared the timer as soon as headers arrived, so a
    // stalled body hung forever despite the timeout.
    const fetchImpl: FetchLike = async (_input, init) =>
      ({
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          }),
      }) as Awaited<ReturnType<FetchLike>>;

    const api = createIntentsConnectApi({
      baseUrl: BASE,
      fetch: fetchImpl,
      timeout: 20,
    });

    const error = await api.listExecutions('0xabc').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(IntentsConnectError);
    expect((error as Error).message).toMatch(/timed out after 20ms/);
  });
});

describe('query building', () => {
  it('joins several statuses into one comma-separated parameter', async () => {
    const fetchImpl = vi.fn(async () =>
      respond(JSON.stringify({ result: [] })),
    );

    await apiWith(fetchImpl as unknown as FetchLike).listExecutions('0xabc', {
      status: ['CREATED', 'DEPOSIT_PENDING'],
    });

    const [url] = fetchImpl.mock.calls[0] as unknown as [string];

    expect(new URL(url).searchParams.get('status')).toBe(
      'CREATED,DEPOSIT_PENDING',
    );
  });

  it('sends x-api-key on create and nowhere else', async () => {
    const fetchImpl = vi.fn(async () =>
      respond(JSON.stringify({ result: [] })),
    );

    const api = apiWith(fetchImpl as unknown as FetchLike);

    await api.listExecutions('0xabc');

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];

    expect(init.headers['x-api-key']).toBeUndefined();
  });
});
