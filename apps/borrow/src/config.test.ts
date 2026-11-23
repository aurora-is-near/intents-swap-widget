import { afterEach, describe, expect, it, vi } from 'vitest';

const loadProjectId = async () => {
  vi.resetModules();

  return (await import('./config')).REOWN_PROJECT_ID;
};

describe('REOWN_PROJECT_ID', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads VITE_REOWN_PROJECT_ID', async () => {
    vi.stubEnv('VITE_REOWN_PROJECT_ID', 'borrow-project');

    expect(await loadProjectId()).toBe('borrow-project');
  });

  it('is undefined when unset, so AppKitProvider uses the shared id', async () => {
    vi.stubEnv('VITE_REOWN_PROJECT_ID', '');

    expect(await loadProjectId()).toBeUndefined();
  });
});
