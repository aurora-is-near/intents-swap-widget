import { afterEach, describe, expect, it, vi } from 'vitest';

const loadClients = async () => {
  vi.resetModules();

  return import('../clients');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getClient', () => {
  it('returns the same client on repeated calls for a chain', async () => {
    const { getClient } = await loadClients();

    expect(getClient(8453)).toBe(getClient(8453));
    expect(getClient(42161)).toBe(getClient(42161));
    expect(getClient(8453)).not.toBe(getClient(42161));
  });

  it('binds each client to its chain', async () => {
    const { getClient } = await loadClients();

    expect(getClient(8453).chain?.id).toBe(8453);
    expect(getClient(42161).chain?.id).toBe(42161);
  });

  it('uses the publicnode RPCs by default', async () => {
    vi.stubEnv('VITE_RPC_URL_BASE', '');
    vi.stubEnv('VITE_RPC_URL_ARB', '');

    const { getClient } = await loadClients();

    expect(getClient(8453).transport.url).toBe(
      'https://base-rpc.publicnode.com',
    );
    expect(getClient(42161).transport.url).toBe(
      'https://arbitrum-one-rpc.publicnode.com',
    );
  });

  it('uses the RPCs from the environment', async () => {
    vi.stubEnv('VITE_RPC_URL_BASE', 'https://base.example');
    vi.stubEnv('VITE_RPC_URL_ARB', 'https://arb.example');

    const { getClient } = await loadClients();

    expect(getClient(8453).transport.url).toBe('https://base.example');
    expect(getClient(42161).transport.url).toBe('https://arb.example');
  });

  it('throws for a chain without an RPC', async () => {
    const { getClient } = await loadClients();

    expect(() => getClient(1)).toThrow('No RPC configured for chain 1');
  });
});
