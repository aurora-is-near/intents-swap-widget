import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

const EVM_ADDRESS = '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464';

type Listener = (payload?: unknown) => void;

type FakeProvider = {
  session?: unknown;
  listeners: Map<string, Set<Listener>>;
  on: Mock;
  off: Mock;
  connect: Mock;
  disconnect: Mock;
  abortPairingAttempt: Mock;
  setDefaultChain: Mock;
  request: Mock;
};

const session = {
  namespaces: { eip155: { accounts: [`eip155:1:${EVM_ADDRESS}`] } },
  peer: { metadata: { name: 'Rainbow', icons: ['rainbow.png'] } },
};

const fake = vi.hoisted(() => ({
  provider: undefined as unknown as FakeProvider,
  init: vi.fn(),
}));

vi.mock('@walletconnect/universal-provider', () => ({
  default: { init: fake.init },
}));

const makeProvider = () => {
  const listeners = new Map<string, Set<Listener>>();

  fake.provider = {
    session: undefined,
    listeners,
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
    }),
    off: vi.fn((event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    }),
    connect: vi.fn(async () => {
      listeners.get('display_uri')?.forEach((listener) => listener('wc:uri'));
      fake.provider.session = session;

      return session;
    }),
    disconnect: vi.fn(async () => {
      fake.provider.session = undefined;
    }),
    abortPairingAttempt: vi.fn(),
    setDefaultChain: vi.fn(),
    request: vi.fn(async () => '0xresult'),
  };
  fake.init.mockResolvedValue(fake.provider);
};

const { createWalletConnectClient, toWalletConnectConnector } = await import(
  '@/connect/walletconnect'
);

const metadata = { name: 'Test', url: 'https://example.test' };

beforeEach(() => {
  fake.init.mockReset();
  makeProvider();
});

describe('createWalletConnectClient', () => {
  it('initialises lazily, once, with the project id and metadata', async () => {
    const client = createWalletConnectClient({ projectId: 'pid', metadata });

    expect(fake.init).not.toHaveBeenCalled();

    await client.getPeer();
    await client.getPeer();

    expect(fake.init).toHaveBeenCalledTimes(1);
    expect(fake.init).toHaveBeenCalledWith({
      projectId: 'pid',
      metadata: { description: '', icons: [], ...metadata },
    });
  });

  it('pairs: hands out the URI and resolves with the peer', async () => {
    const client = createWalletConnectClient({ metadata, chainIds: [1, 8453] });
    const onUri = vi.fn();

    await expect(client.pair(onUri)).resolves.toEqual({
      address: EVM_ADDRESS,
      name: 'Rainbow',
      icon: 'rainbow.png',
    });
    expect(onUri).toHaveBeenCalledWith('wc:uri');
    expect(fake.provider.connect).toHaveBeenCalledWith({
      optionalNamespaces: {
        eip155: expect.objectContaining({
          chains: ['eip155:1', 'eip155:8453'],
        }),
      },
    });
    // The URI listener does not outlive the pairing.
    expect(fake.provider.listeners.get('display_uri')?.size).toBe(0);
  });

  it('replaces an existing session when pairing again', async () => {
    const client = createWalletConnectClient({ metadata });

    fake.provider.session = session;
    await client.pair(vi.fn());

    expect(fake.provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it('restores a persisted session without UI', async () => {
    const client = createWalletConnectClient({ metadata });

    await expect(client.getPeer()).resolves.toBeNull();

    fake.provider.session = session;

    await expect(client.getPeer()).resolves.toMatchObject({
      address: EVM_ADDRESS,
    });
    expect(fake.provider.connect).not.toHaveBeenCalled();
  });

  it('keeps chain switches local and routes requests to that chain', async () => {
    const client = createWalletConnectClient({ metadata });
    const provider = client.createProvider();

    fake.provider.session = session;

    await expect(
      provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      }),
    ).resolves.toBeNull();

    await provider.request({ method: 'eth_chainId' });

    expect(fake.provider.setDefaultChain).toHaveBeenCalledWith('eip155:8453');
    expect(fake.provider.request).toHaveBeenCalledTimes(1);
    expect(fake.provider.request).toHaveBeenCalledWith(
      { method: 'eth_chainId', params: undefined },
      'eip155:8453',
    );
  });

  it('refuses requests once the session is gone', async () => {
    const provider = createWalletConnectClient({ metadata }).createProvider();

    await expect(provider.request({ method: 'eth_accounts' })).rejects.toThrow(
      /disconnected/,
    );
  });

  it('reports a session the wallet ended, until unsubscribed', async () => {
    const client = createWalletConnectClient({ metadata });
    const listener = vi.fn();
    const unsubscribe = client.onSessionEnd(listener);

    await client.getPeer();
    fake.provider.listeners.get('session_delete')?.forEach((l) => l());

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    fake.provider.listeners.get('session_delete')?.forEach((l) => l());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('retries initialisation after a failure', async () => {
    fake.init.mockRejectedValueOnce(new Error('relay down'));

    const client = createWalletConnectClient({ metadata });

    await expect(client.getPeer()).rejects.toThrow('relay down');
    await expect(client.getPeer()).resolves.toBeNull();
  });
});

describe('toWalletConnectConnector', () => {
  it('signs with erc191 over the session and disconnects it', async () => {
    const client = createWalletConnectClient({ metadata });
    const connector = toWalletConnectConnector(client, {
      address: EVM_ADDRESS,
      name: 'Rainbow',
    });

    fake.provider.session = session;

    expect(connector).toMatchObject({
      id: 'walletconnect',
      name: 'Rainbow',
      signingStandard: 'erc191',
    });
    expect(connector.getAddress()).toBe(EVM_ADDRESS);

    await connector.disconnect();

    expect(fake.provider.disconnect).toHaveBeenCalledTimes(1);
  });
});
