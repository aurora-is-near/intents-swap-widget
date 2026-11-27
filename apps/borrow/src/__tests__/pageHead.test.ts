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

  it.each([
    ['/positions', 'My positions · Aurora Borrow'],
    ['/swap', 'Swap · Aurora Borrow'],
  ])('keeps %s out of search', async (path, title) => {
    expect(await headAt(path)).toEqual({ title, noindex: true });
  });

  it('falls back to the not-found head with no matched route', () => {
    expect(headOf([])).toBe(NOT_FOUND_HEAD);
  });
});
