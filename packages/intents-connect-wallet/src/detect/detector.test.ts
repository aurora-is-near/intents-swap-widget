/* eslint-env browser */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletDetector, pickConnectedWallet } from '@/detect';
import type {
  Eip1193Like,
  InjectedNearWallet,
  StandardWalletLike,
  WalletDetector,
} from '@/detect';

const EVM_ADDRESS = '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464';
const SOL_ADDRESS = 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq';

const cleanups: (() => void)[] = [];
const detectors: WalletDetector[] = [];

const listen = (type: string, handler: (event: Event) => void) => {
  window.addEventListener(type, handler);
  cleanups.push(() => window.removeEventListener(type, handler));
};

const detect = (...args: Parameters<typeof createWalletDetector>) => {
  const detector = createWalletDetector(...args);

  detectors.push(detector);

  return detector;
};

afterEach(() => {
  vi.unstubAllGlobals();
  detectors.splice(0).forEach((detector) => detector.destroy());
  cleanups.splice(0).forEach((cleanup) => cleanup());
  delete (window as { ethereum?: unknown }).ethereum;
});

const evmProvider = (
  accounts: string[] = [EVM_ADDRESS],
  chainId = '0x2105',
) => {
  const listeners = new Map<string, (data: unknown) => void>();
  const provider: Eip1193Like & {
    emit: (event: string) => void;
    removeListener: ReturnType<typeof vi.fn>;
  } = {
    request: vi.fn(async ({ method }: { method: string }) =>
      method === 'eth_accounts' ? accounts : chainId,
    ),
    on: (event, listener) => {
      listeners.set(event, listener);
    },
    removeListener: vi.fn((event: string) => {
      listeners.delete(event);
    }),
    emit: (event) => listeners.get(event)?.(undefined),
  };

  return provider;
};

/** Announces like an EIP-6963 wallet: now and on every request. */
const announceEvm = (
  provider: Eip1193Like,
  info = { uuid: 'uuid-1', name: 'MetaMask', rdns: 'io.metamask', icon: 'i' },
) => {
  const announce = () =>
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: { info, provider },
      }),
    );

  listen('eip6963:requestProvider', announce);
  announce();
};

const solanaWallet = (
  accounts: { address: string }[] = [{ address: SOL_ADDRESS }],
  overrides: Partial<StandardWalletLike> = {},
): StandardWalletLike & { connect: ReturnType<typeof vi.fn> } => {
  const connect = vi.fn(async () => ({ accounts }));

  return {
    name: 'Phantom',
    icon: 'icon',
    chains: ['solana:mainnet'],
    accounts,
    features: {
      'standard:connect': { connect },
      'solana:signMessage': { signMessage: vi.fn() },
      'solana:signTransaction': { signTransaction: vi.fn() },
    },
    connect,
    ...overrides,
  };
};

/** A wallet that loaded before the app: answers `app-ready`. */
const preloadSolana = (wallet: StandardWalletLike) =>
  listen('wallet-standard:app-ready', (event) => {
    (
      event as CustomEvent<{ register: (w: StandardWalletLike) => void }>
    ).detail.register(wallet);
  });

const nearWallet = (
  accounts = [{ accountId: 'alice.near', publicKey: 'ed25519:Key' }],
): InjectedNearWallet => ({
  manifest: { id: 'hot-wallet', name: 'HOT', icon: 'icon' },
  getAccounts: vi.fn(async () => accounts),
  signMessage: vi.fn(),
  signAndSendTransactions: vi.fn(),
});

const injectNear = (wallet: InjectedNearWallet) =>
  listen('near-selector-ready', () =>
    window.dispatchEvent(
      new CustomEvent('near-wallet-injected', { detail: wallet }),
    ),
  );

describe('createWalletDetector', () => {
  it('reports EVM wallets announced over EIP-6963 with their shared account', async () => {
    const provider = evmProvider();

    announceEvm(provider);

    const detector = detect({ families: ['evm'] });

    await detector.refresh();

    expect(detector.getSnapshot()).toMatchObject({
      ready: true,
      wallets: [
        {
          id: 'evm:io.metamask',
          family: 'evm',
          name: 'MetaMask',
          address: EVM_ADDRESS,
          chainId: 8453,
          provider,
        },
      ],
    });
    expect(provider.request).not.toHaveBeenCalledWith({
      method: 'eth_requestAccounts',
    });
  });

  it('lists a locked EVM wallet without an address', async () => {
    announceEvm(evmProvider([]));

    const detector = detect({ families: ['evm'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets[0]).toMatchObject({
      address: null,
    });
  });

  it('falls back to window.ethereum only when nothing announces', async () => {
    (window as { ethereum?: unknown }).ethereum = evmProvider();

    const detector = detect({ families: ['evm'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets).toMatchObject([
      { id: 'evm:legacy', name: 'Browser wallet', address: EVM_ADDRESS },
    ]);
  });

  it('re-reads when an EVM wallet switches accounts', async () => {
    vi.useFakeTimers();

    try {
      const provider = evmProvider();

      announceEvm(provider);

      const detector = detect({ families: ['evm'] });
      const onChange = vi.fn();

      detector.subscribe(onChange);
      await vi.advanceTimersByTimeAsync(60);
      onChange.mockClear();

      (provider.request as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ method }: { method: string }) =>
          method === 'eth_accounts'
            ? ['0x1111111111111111111111111111111111111111']
            : '0x1',
      );
      provider.emit('accountsChanged');
      await vi.advanceTimersByTimeAsync(60);

      expect(onChange).toHaveBeenCalled();
      expect(detector.getSnapshot().wallets[0]?.address).toBe(
        '0x1111111111111111111111111111111111111111',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('finds Wallet Standard wallets registered before and after it', async () => {
    preloadSolana(solanaWallet());

    const detector = detect({ families: ['sol'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets).toMatchObject([
      { id: 'sol:Phantom', family: 'sol', address: SOL_ADDRESS },
    ]);

    const late = solanaWallet([], { name: 'Solflare' });

    window.dispatchEvent(
      new CustomEvent('wallet-standard:register-wallet', {
        detail: ({ register }: { register: (w: StandardWalletLike) => void }) =>
          register(late),
      }),
    );
    await detector.refresh();

    expect(detector.getSnapshot().wallets.map((w) => w.id)).toEqual([
      'sol:Phantom',
      'sol:Solflare',
    ]);
  });

  it('ignores Wallet Standard wallets that cannot sign on Solana mainnet', async () => {
    preloadSolana(solanaWallet(undefined, { chains: ['solana:devnet'] }));

    const detector = detect({ families: ['sol'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets).toEqual([]);
  });

  it('only reconnects Solana wallets silently when asked to', async () => {
    const quiet = solanaWallet([]);

    preloadSolana(quiet);

    const off = detect({ families: ['sol'] });

    await off.refresh();

    expect(quiet.connect).not.toHaveBeenCalled();

    off.destroy();

    const on = detect({ families: ['sol'], silentSolanaConnect: true });

    await on.refresh();

    expect(quiet.connect).toHaveBeenCalledWith({ silent: true });
  });

  it('reads injected NEAR wallets with their public key', async () => {
    const wallet = nearWallet();

    injectNear(wallet);

    const detector = detect({ families: ['near'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets).toMatchObject([
      {
        id: 'near:hot-wallet',
        family: 'near',
        address: 'alice.near',
        publicKey: 'ed25519:Key',
      },
    ]);
    expect(wallet.getAccounts).toHaveBeenCalledWith({ network: 'mainnet' });
  });

  it('keeps the same snapshot object when nothing changed', async () => {
    announceEvm(evmProvider());

    const detector = detect({ families: ['evm'] });

    await detector.refresh();

    const first = detector.getSnapshot();

    await detector.refresh();

    expect(detector.getSnapshot()).toBe(first);
  });

  it('removes its listeners on destroy', async () => {
    const provider = evmProvider();

    announceEvm(provider);

    const detector = detect({ families: ['evm'] });

    await detector.refresh();
    detector.destroy();

    expect(provider.removeListener).toHaveBeenCalledWith(
      'accountsChanged',
      expect.any(Function),
    );

    announceEvm(evmProvider(), {
      uuid: 'uuid-2',
      name: 'Rabby',
      rdns: 'io.rabby',
      icon: 'i',
    });
    await detector.refresh();

    expect(detector.getSnapshot().wallets).toHaveLength(1);
  });

  it('reports nothing and attaches nothing without a window', async () => {
    vi.stubGlobal('window', undefined);

    const detector = createWalletDetector();

    await detector.refresh();

    expect(detector.getSnapshot()).toEqual({ ready: false, wallets: [] });
  });
});

describe('createWalletDetector resilience', () => {
  it('keeps detecting when a wallet misbehaves', async () => {
    const throwsOn = evmProvider();

    throwsOn.on = () => {
      throw new Error('on() not supported');
    };

    announceEvm(throwsOn);

    const syncThrow = nearWallet();

    syncThrow.getAccounts = () => {
      throw new Error('boom');
    };

    injectNear(syncThrow);
    injectNear({
      ...nearWallet(),
      manifest: { id: 'odd', name: 'Odd' },
      getAccounts: vi.fn(async () => ({ not: 'an array' }) as never),
    });
    preloadSolana(solanaWallet());

    const detector = detect();

    await detector.refresh();

    const snapshot = detector.getSnapshot();

    expect(snapshot.ready).toBe(true);
    expect(
      snapshot.wallets.map((wallet) => [wallet.id, wallet.address]),
    ).toEqual([
      ['evm:io.metamask', EVM_ADDRESS],
      ['sol:Phantom', SOL_ADDRESS],
      ['near:hot-wallet', null],
      ['near:odd', null],
    ]);
  });

  it('finds a NEAR wallet that injects only after detection started', async () => {
    const detector = detect({ families: ['near'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets).toEqual([]);

    // The extension loads late and answers the next announcement.
    injectNear(nearWallet());
    await detector.refresh();

    expect(detector.getSnapshot().wallets.map((w) => w.id)).toEqual([
      'near:hot-wallet',
    ]);
  });

  it('settles refresh() on a pass that started after the call', async () => {
    let accounts: string[] = [];
    const provider = evmProvider();

    (provider.request as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ method }: { method: string }) =>
        method === 'eth_accounts' ? accounts : '0x1',
    );
    announceEvm(provider);

    const detector = detect({ families: ['evm'] });
    const first = detector.refresh();

    accounts = [EVM_ADDRESS];

    const second = detector.refresh();

    await Promise.all([first, second]);

    expect(detector.getSnapshot().wallets[0]?.address).toBe(EVM_ADDRESS);
  });

  it('asks each Solana wallet to reconnect silently only once', async () => {
    const quiet = solanaWallet([]);

    quiet.connect.mockResolvedValue({ accounts: [] });
    preloadSolana(quiet);

    const detector = detect({ families: ['sol'], silentSolanaConnect: true });

    await detector.refresh();
    await detector.refresh();
    await detector.refresh();

    expect(quiet.connect).toHaveBeenCalledTimes(1);
  });

  it('skips a Solana account scoped away from mainnet', async () => {
    preloadSolana(
      solanaWallet([
        { address: 'Devnet111', chains: ['solana:devnet'] } as {
          address: string;
        },
        { address: SOL_ADDRESS },
      ]),
    );

    const detector = detect({ families: ['sol'] });

    await detector.refresh();

    expect(detector.getSnapshot().wallets[0]?.address).toBe(SOL_ADDRESS);
  });
});

describe('pickConnectedWallet', () => {
  it('returns the first connected wallet in preference order', async () => {
    announceEvm(evmProvider([]));
    preloadSolana(solanaWallet());
    injectNear(nearWallet());

    const detector = detect();

    await detector.refresh();

    const { wallets } = detector.getSnapshot();

    expect(pickConnectedWallet(wallets)?.id).toBe('sol:Phantom');
    expect(pickConnectedWallet(wallets, ['near', 'sol'])?.id).toBe(
      'near:hot-wallet',
    );
    expect(pickConnectedWallet(wallets, ['evm'])).toBeUndefined();
  });
});
