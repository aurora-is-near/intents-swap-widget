import { describe, expect, it, vi } from 'vitest';

import { createIntentsConnectActionsApi } from '@/actions';
import type { ActionResolution } from '@/actions';
import { IntentsConnectActionsApiError } from '@/errors';
import type { FetchLike } from '@/http';

const BASE = 'https://actions.example.test/prefix';
const HASH = 'cf4a065b25d026dbf38b8724ced0d58642309f404672e552d038fa3e64b983fa';

const respond = (
  body: unknown,
  { ok = true, status = 200 } = {},
): Awaited<ReturnType<FetchLike>> => ({
  ok,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const RESOLUTION: ActionResolution = {
  actionId: 'aave-v3-borrow',
  version: 1,
  executionChain: 'base',
  actionSha256Hash: HASH,
  execution: {
    version: '1.0',
    type: 'evm',
    quote: {
      originAsset: 'nep141:eth.omft.near',
      destinationAsset: 'nep141:base.omft.near',
      amount: '3000000000000000',
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
    },
    outOperation: false,
    dry: false,
    metadata: { intent: 'aave_borrow', title: 'Borrow' },
    steps: [],
  },
};

describe('createIntentsConnectActionsApi', () => {
  it('lists the catalog from GET api/v1/actions, unwrapping result', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      respond({ result: [{ id: 'aave-v3-borrow', version: 1 }] }),
    );

    const actions = await createIntentsConnectActionsApi({
      baseUrl: BASE,
      fetch: fetchImpl,
    }).listActions();

    expect(actions).toEqual([{ id: 'aave-v3-borrow', version: 1 }]);

    const [url, init] = fetchImpl.mock.calls[0]!;

    // The base URL's path prefix survives.
    expect(url).toBe(`${BASE}/api/v1/actions`);
    expect(init?.method).toBe('GET');
    expect(init?.headers).not.toHaveProperty('x-api-key');
  });

  it('resolves with the pinned version, hash and inputs', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      respond({ result: RESOLUTION }),
    );

    const resolution = await createIntentsConnectActionsApi({
      baseUrl: BASE,
      fetch: fetchImpl,
    }).resolveAction('aave-v3-borrow', {
      version: 1,
      expectedSha256Hash: HASH,
      inputs: { chain: 'base' },
    });

    expect(resolution).toEqual(RESOLUTION);

    const [url, init] = fetchImpl.mock.calls[0]!;

    expect(url).toBe(`${BASE}/api/v1/actions/aave-v3-borrow/resolve`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body ?? '')).toEqual({
      version: 1,
      expectedSha256Hash: HASH,
      inputs: { chain: 'base' },
    });
  });

  it('omits expectedSha256Hash when it is not pinned', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      respond({ result: RESOLUTION }),
    );

    await createIntentsConnectActionsApi({
      baseUrl: BASE,
      fetch: fetchImpl,
    }).resolveAction('aave-v3-borrow', { version: 0, inputs: {} });

    expect(JSON.parse(fetchImpl.mock.calls[0]![1]?.body ?? '')).toEqual({
      version: 0,
      inputs: {},
    });
  });

  it.each([
    [409, true],
    [400, false],
    [404, false],
  ] as const)(
    'throws an IntentsConnectActionsApiError on %s with the API message (hash mismatch: %s)',
    async (status, hashMismatch) => {
      const api = createIntentsConnectActionsApi({
        baseUrl: BASE,
        fetch: async () =>
          respond(
            { error: 'invalid action input: nope' },
            { ok: false, status },
          ),
      });

      const error = (await api
        .resolveAction('aave-v3-borrow', { version: 1, inputs: {} })
        .catch((e: unknown) => e)) as IntentsConnectActionsApiError;

      expect(error).toBeInstanceOf(IntentsConnectActionsApiError);
      expect(error.status).toBe(status);
      expect(error.message).toBe('invalid action input: nope');
      expect(error.isHashMismatch).toBe(hashMismatch);
    },
  );

  it('reports the status of a non-JSON error page', async () => {
    const api = createIntentsConnectActionsApi({
      baseUrl: BASE,
      fetch: async () =>
        respond('<html>502 Bad Gateway</html>', { ok: false, status: 502 }),
    });

    await expect(api.listActions()).rejects.toThrow(
      /actions API responded 502/,
    );
  });
});
