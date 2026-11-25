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
  vi.restoreAllMocks();
});

describe('missing Intents Connect API key', () => {
  it('is reported once at start-up', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubEnv('VITE_INTENTS_CONNECT_API_KEY', ' ');

    const { MISSING_INTENTS_CONNECT_API_KEY_MESSAGE } = await loadConfig();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(MISSING_INTENTS_CONNECT_API_KEY_MESSAGE);
  });

  it('is not reported when the key is set', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubEnv('VITE_INTENTS_CONNECT_API_KEY', 'client-key');

    await loadConfig();

    expect(error).not.toHaveBeenCalled();
  });
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

describe('RPC URLs', () => {
  it('fall back to the publicnode defaults when unset', async () => {
    vi.stubEnv('VITE_RPC_URL_BASE', '');
    vi.stubEnv('VITE_RPC_URL_ARB', '');

    const { RPC_URL_BASE, RPC_URL_ARB } = await loadConfig();

    expect(RPC_URL_BASE).toBe('https://base-rpc.publicnode.com');
    expect(RPC_URL_ARB).toBe('https://arbitrum-one-rpc.publicnode.com');
  });

  it('read VITE_RPC_URL_BASE and VITE_RPC_URL_ARB', async () => {
    vi.stubEnv('VITE_RPC_URL_BASE', ' https://base.example ');
    vi.stubEnv('VITE_RPC_URL_ARB', 'https://arb.example');

    const { RPC_URL_BASE, RPC_URL_ARB } = await loadConfig();

    expect(RPC_URL_BASE).toBe('https://base.example');
    expect(RPC_URL_ARB).toBe('https://arb.example');
  });
});

describe('intentsConnectApi', () => {
  it('uses the alpha API and no key by default', async () => {
    vi.stubEnv('VITE_INTENTS_CONNECT_API_URL', '');
    vi.stubEnv('VITE_INTENTS_CONNECT_API_KEY', '');

    const { intentsConnectApi } = await loadConfig();

    expect(createIntentsConnectApi).toHaveBeenCalledTimes(1);

    const [options] = createIntentsConnectApi.mock.calls[0] ?? [];

    expect(options).toEqual({
      baseUrl: 'https://intents-connect-alpha-api.aurora.dev',
      apiKey: undefined,
    });
    expect(intentsConnectApi).toEqual({ options });
  });

  it('reads the URL and the client-side key from the environment', async () => {
    vi.stubEnv('VITE_INTENTS_CONNECT_API_URL', 'https://api.example');
    vi.stubEnv('VITE_INTENTS_CONNECT_API_KEY', ' client-key ');

    await loadConfig();

    const [options] = createIntentsConnectApi.mock.calls[0] ?? [];

    expect(options).toEqual({
      baseUrl: 'https://api.example',
      apiKey: 'client-key',
    });
    expect(options).not.toHaveProperty('apiKeyProxyUrl');
  });
});
