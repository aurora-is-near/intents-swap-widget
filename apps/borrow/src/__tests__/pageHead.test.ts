import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { headOf, NOT_FOUND_HEAD } from '@/pageHead';
import { createAppRouter } from '@/router';

const headAt = async (path: string) => {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );

  await router.load();

  return headOf(router.state.matches);
};

describe('page heads', () => {
  it('indexes New loan, with its own title and description', async () => {
    const head = await headAt('/');

    expect(head.title).toBe('One click borrow · Aurora Borrow');
    expect(head.description).toContain('Aurora Borrow');
    expect(head.noindex).toBeUndefined();
  });

  it('indexes Swap, with its own title and description', async () => {
    const head = await headAt('/swap');

    expect(head.title).toBe('Swap · Aurora Borrow');
    expect(head.description).toContain('one signed intent');
    expect(head.noindex).toBeUndefined();
  });

  it('keeps /positions out of search', async () => {
    expect(await headAt('/positions')).toEqual({
      title: 'My positions · Aurora Borrow',
      noindex: true,
    });
  });

  it('falls back to the not-found head with no matched route', () => {
    expect(headOf([])).toBe(NOT_FOUND_HEAD);
  });
});
