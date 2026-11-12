import { describe, expect, it, vi } from 'vitest';

import { createResource } from '@/resource';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('createResource', () => {
  it('loads a key and records success', async () => {
    const resource = createResource(async (key) => `value:${key}`, {
      now: () => 42,
    });

    expect(resource.state.status).toBe('idle');
    await expect(resource.refresh('a')).resolves.toBe('value:a');
    expect(resource.state).toMatchObject({
      status: 'success',
      key: 'a',
      data: 'value:a',
      updatedAt: 42,
    });
  });

  it('shares one request between concurrent refreshes of a key', async () => {
    const fetcher = vi.fn(async (key: string) => key);
    const resource = createResource(fetcher);

    await Promise.all([resource.refresh('a'), resource.refresh('a')]);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('drops a response for a key that is no longer current', async () => {
    const slow = deferred<string>();
    const resource = createResource((key) =>
      key === 'a' ? slow.promise : Promise.resolve('b-data'),
    );

    const first = resource.refresh('a');

    await resource.refresh('b');
    slow.resolve('a-data');
    await first;

    expect(resource.state).toMatchObject({ key: 'b', data: 'b-data' });
  });

  it('clears data when switching keys but keeps it while the same key reloads', async () => {
    const next = deferred<string>();
    let calls = 0;
    const resource = createResource((key: string): Promise<string> => {
      calls += 1;

      return key === 'a' && calls === 1 ? Promise.resolve('a1') : next.promise;
    });

    await resource.refresh('a');

    const reload = resource.refresh('a');

    expect(resource.state).toMatchObject({ status: 'loading', data: 'a1' });

    next.resolve('a2');
    await reload;

    expect(resource.state.data).toBe('a2');

    void resource.refresh('c');

    expect(resource.state.data).toBeUndefined();
  });

  it('keeps the last data and records the error on failure', async () => {
    let fail = false;
    const resource = createResource(async () => {
      if (fail) {
        throw new Error('boom');
      }

      return 'ok';
    });

    await resource.refresh('a');
    fail = true;

    await expect(resource.refresh('a')).resolves.toBeUndefined();

    expect(resource.state).toMatchObject({ status: 'error', data: 'ok' });
    expect(resource.state.error?.message).toBe('boom');
  });

  it('resets to idle', async () => {
    const resource = createResource(async () => 'x');

    await resource.refresh('a');
    resource.reset();

    expect(resource.state).toMatchObject({ status: 'idle' });
    expect(resource.state.key).toBeUndefined();
    expect(resource.state.data).toBeUndefined();
  });
});
