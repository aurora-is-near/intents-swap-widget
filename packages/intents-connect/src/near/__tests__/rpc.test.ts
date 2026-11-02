import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '@/http';
import {
  balanceRpcUrls,
  getNativeNearBalance,
  NearContractError,
  NearRpcError,
  NearUnknownAccountError,
  proofRpcUrls,
  viewCall,
} from '@/near';
import { resetDeadNearRpcUrls } from '@/near/rpc';

type Reply = { status?: number; body?: unknown; throws?: boolean };

const bytes = (value: unknown) =>
  Array.from(new TextEncoder().encode(JSON.stringify(value)));

/** Routes each URL to its own scripted reply. */
const fetchFor = (replies: Record<string, Reply>) =>
  vi.fn<FetchLike>(async (url) => {
    const reply = replies[url];

    if (!reply || reply.throws) {
      throw new TypeError('Failed to fetch');
    }

    const status = reply.status ?? 200;

    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () =>
        typeof reply.body === 'string'
          ? reply.body
          : JSON.stringify(reply.body),
    };
  });

const A = 'https://a.example.test';
const B = 'https://b.example.test';

beforeEach(() => resetDeadNearRpcUrls());

describe('viewCall', () => {
  it('encodes args as base64 UTF-8 JSON and decodes the result bytes', async () => {
    const fetchImpl = fetchFor({
      [A]: { body: { result: { result: bytes({ ok: 'é' }) } } },
    });

    await expect(
      viewCall({
        contractId: 'intents.near',
        methodName: 'm',
        args: { name: 'ünïcode' },
        rpcUrls: [A],
        fetch: fetchImpl,
      }),
    ).resolves.toEqual({ ok: 'é' });

    const sent = JSON.parse(fetchImpl.mock.calls[0]![1]!.body!) as {
      params: { args_base64: string; account_id: string };
    };

    expect(sent.params.account_id).toBe('intents.near');
    expect(
      new TextDecoder().decode(
        Uint8Array.from(atob(sent.params.args_base64), (c) => c.charCodeAt(0)),
      ),
    ).toBe('{"name":"ünïcode"}');
  });

  it('fails over on a network error, a 5xx and a node error', async () => {
    const C = 'https://c.example.test';
    const D = 'https://d.example.test';
    const fetchImpl = fetchFor({
      [A]: { throws: true },
      [B]: { status: 503, body: 'down' },
      [C]: { body: { error: { cause: { name: 'TIMEOUT_ERROR' } } } },
      [D]: { body: { result: { result: bytes(7) } } },
    });

    await expect(
      viewCall({
        contractId: 'x.near',
        methodName: 'm',
        args: {},
        rpcUrls: [A, B, C, D],
        fetch: fetchImpl,
      }),
    ).resolves.toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('throws a contract panic at once instead of failing over', async () => {
    const fetchImpl = fetchFor({
      [A]: {
        body: {
          result: {
            error:
              'wasm execution failed: Smart contract panicked: invalid signature',
          },
        },
      },
      [B]: { body: { result: { result: bytes(1) } } },
    });

    const error = await viewCall({
      contractId: 'intents.near',
      methodName: 'simulate_intents',
      args: {},
      rpcUrls: [A, B],
      fetch: fetchImpl,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NearContractError);
    expect((error as NearContractError).methodName).toBe('simulate_intents');
    expect((error as Error).message).toContain('invalid signature');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a CONTRACT_EXECUTION_ERROR cause as a contract error', async () => {
    const fetchImpl = fetchFor({
      [A]: {
        body: {
          error: {
            cause: { name: 'CONTRACT_EXECUTION_ERROR' },
            data: 'panicked: nonce used',
          },
        },
      },
    });

    await expect(
      viewCall({
        contractId: 'intents.near',
        methodName: 'm',
        args: {},
        rpcUrls: [A, B],
        fetch: fetchImpl,
      }),
    ).rejects.toBeInstanceOf(NearContractError);
  });

  it('reports every endpoint failing as a NearRpcError', async () => {
    const fetchImpl = fetchFor({ [A]: { throws: true }, [B]: { status: 500 } });

    const error = await viewCall({
      contractId: 'x.near',
      methodName: 'm',
      args: {},
      rpcUrls: [A, B],
      fetch: fetchImpl,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NearRpcError);
    expect((error as Error).message).toContain('failed on every endpoint');
  });

  it('skips a URL that answered 404 on later calls', async () => {
    const fetchImpl = fetchFor({
      [A]: { status: 404, body: { message: 'Application key not found' } },
      [B]: { body: { result: { result: bytes(1) } } },
    });

    const call = () =>
      viewCall({
        contractId: 'x.near',
        methodName: 'm',
        args: {},
        rpcUrls: [A, B],
        fetch: fetchImpl,
      });

    await call();
    await call();

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([A, B, B]);
  });

  it('times out a stalled endpoint and moves on', async () => {
    const fetchImpl = vi.fn<FetchLike>((url, init) =>
      url === A
        ? new Promise((_, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            );
          })
        : Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ result: { result: bytes(2) } }),
          }),
    );

    await expect(
      viewCall({
        contractId: 'x.near',
        methodName: 'm',
        args: {},
        rpcUrls: [A, B],
        fetch: fetchImpl,
        timeout: 5,
      }),
    ).resolves.toBe(2);
  });

  it('resolves global fetch at call time', async () => {
    const stub = fetchFor({ [A]: { body: { result: { result: bytes(3) } } } });

    vi.stubGlobal('fetch', stub);

    try {
      await expect(
        viewCall({ contractId: 'x', methodName: 'm', args: {}, rpcUrls: [A] }),
      ).resolves.toBe(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('getNativeNearBalance', () => {
  it('returns the account amount', async () => {
    const fetchImpl = fetchFor({ [A]: { body: { result: { amount: '42' } } } });

    await expect(
      getNativeNearBalance('alice.near', { rpcUrls: [A], fetch: fetchImpl }),
    ).resolves.toBe('42');
  });

  it('returns 0 for an account that does not exist, without failing over', async () => {
    const fetchImpl = fetchFor({
      [A]: {
        body: {
          error: {
            cause: {
              name: 'UNKNOWN_ACCOUNT',
              info: { requested_account_id: 'ghost.near' },
            },
          },
        },
      },
    });

    await expect(
      getNativeNearBalance('ghost.near', { rpcUrls: [A, B], fetch: fetchImpl }),
    ).resolves.toBe('0');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('surfaces the typed error to direct callers', async () => {
    const { nearRpc } = await import('@/near');
    const fetchImpl = fetchFor({
      [A]: { body: { error: { cause: { name: 'UNKNOWN_ACCOUNT' } } } },
    });

    await expect(
      nearRpc({
        method: 'query',
        params: {},
        context: { accountId: 'ghost.near' },
        rpcUrls: [A],
        fetch: fetchImpl,
      }),
    ).rejects.toBeInstanceOf(NearUnknownAccountError);
  });
});

describe('rpc url order', () => {
  const api = { nearRpcUrl: 'https://proxy.example.test/rpc/k' };

  it('puts the proxy first for proof calls', () => {
    expect(proofRpcUrls(api)[0]).toBe(api.nearRpcUrl);
    expect(proofRpcUrls(api, [A])).toEqual([api.nearRpcUrl, A]);
  });

  it('puts the proxy last for balance reads', () => {
    expect(balanceRpcUrls(api, [A])).toEqual([A, api.nearRpcUrl]);
    expect(balanceRpcUrls().length).toBeGreaterThan(0);
  });
});
