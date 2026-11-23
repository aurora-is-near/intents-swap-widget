import { afterEach, describe, expect, it, vi } from 'vitest';

const createIntentsConnectApi = vi.hoisted(() =>
  vi.fn((options: object) => ({ options })),
);

vi.mock('@aurora-is-near/intents-connect', () => ({
  createIntentsConnectApi,
}));

const loadConfig = async () => {
  vi.resetModules();
  createIntentsConnectApi.mockClear();

  return import('./config');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('REOWN_PROJECT_ID', () => {
  it('reads VITE_REOWN_PROJECT_ID', async () => {
    vi.stubEnv('VITE_REOWN_PROJECT_ID', 'borrow-project');

    expect((await loadConfig()).REOWN_PROJECT_ID).toBe('borrow-project');
  });

  it('is undefined when unset, so AppKitProvider uses the shared id', async () => {
    vi.stubEnv('VITE_REOWN_PROJECT_ID', '');

    expect((await loadConfig()).REOWN_PROJECT_ID).toBeUndefined();
  });
});

describe('intentsConnectApi', () => {
  it('sends create calls through the same-origin proxy by default, with no key', async () => {
    vi.stubEnv('VITE_INTENTS_CONNECT_API_URL', '');
    vi.stubEnv('VITE_INTENTS_CONNECT_API_KEY_PROXY_URL', '');

    const { intentsConnectApi } = await loadConfig();

    expect(createIntentsConnectApi).toHaveBeenCalledTimes(1);

    const [options] = createIntentsConnectApi.mock.calls[0] ?? [];

    expect(options).toEqual({
      baseUrl: 'https://intents-connect-alpha-api.aurora.dev',
      apiKeyProxyUrl: `${window.location.origin}/api/intents-connect`,
    });
    expect(options).not.toHaveProperty('apiKey');
    expect(intentsConnectApi).toEqual({ options });
  });

  it('reads both URLs from the environment', async () => {
    vi.stubEnv('VITE_INTENTS_CONNECT_API_URL', 'https://api.example');
    vi.stubEnv(
      'VITE_INTENTS_CONNECT_API_KEY_PROXY_URL',
      'https://proxy.example/keyed',
    );

    await loadConfig();

    const [options] = createIntentsConnectApi.mock.calls[0] ?? [];

    expect(options).toEqual({
      baseUrl: 'https://api.example',
      apiKeyProxyUrl: 'https://proxy.example/keyed',
    });
    expect(options).not.toHaveProperty('apiKey');
  });
});
