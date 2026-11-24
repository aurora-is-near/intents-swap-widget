import { afterEach, describe, expect, it, vi } from 'vitest';

const loadIntentsApi = async () => {
  vi.resetModules();

  return import('./intentsApi');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('intentsApi', () => {
  it('reads VITE_INTENTS_API_KEY and reports nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubEnv('VITE_INTENTS_API_KEY', 'borrow-key');

    const { INTENTS_API_KEY, intentsApi } = await loadIntentsApi();

    expect(INTENTS_API_KEY).toBe('borrow-key');
    expect(intentsApi.apiKey).toBe('borrow-key');
    expect(error).not.toHaveBeenCalled();
  });

  it('reports a configuration error when the key is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubEnv('VITE_INTENTS_API_KEY', '');

    const { INTENTS_API_KEY, MISSING_INTENTS_API_KEY_MESSAGE } =
      await loadIntentsApi();

    expect(INTENTS_API_KEY).toBeUndefined();
    expect(error).toHaveBeenCalledWith(MISSING_INTENTS_API_KEY_MESSAGE);
    expect(MISSING_INTENTS_API_KEY_MESSAGE).toContain('VITE_INTENTS_API_KEY');
  });
});
