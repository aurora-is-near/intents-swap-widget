import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useWallet } from '../../hooks/useWallet';
import { WalletSessionProvider } from '../WalletSessionProvider';
import type { WalletSession } from '../../types';

/**
 * The package's connector hooks are stubbed over one mutable store, so a
 * test can connect a family the way the real hooks do: by a state update.
 * `useWalletSelector`, the presets and the modal are the package's own.
 */
const store = vi.hoisted(() => {
  type Connector = {
    id: string;
    isConnected: boolean;
    address: string | undefined;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    getProviders?: () => Record<string, unknown>;
  };

  const connector = (id: string): Connector => ({
    id,
    isConnected: false,
    address: undefined,
    connect: async () => {},
    disconnect: async () => {},
  });

  const listeners = new Set<() => void>();
  const state = {
    version: 0,
    appKitFamily: null as 'evm' | 'sol' | null,
    appKitWallet: null as object | null,
    evm: connector('evm-solana'),
    near: connector('near'),
    stellar: connector('stellar'),
  };

  return {
    state,
    connector,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    update: (change: (s: typeof state) => void) => {
      change(state);
      state.version += 1;
      listeners.forEach((listener) => listener());
    },
  };
});

const adapters = vi.hoisted(() => ({
  near: vi.fn(() => ({ connector: { id: 'near-wallet' } })),
  stellar: vi.fn(() => ({ connector: { id: 'stellar-wallet' } })),
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () => {
  const { createContext, useSyncExternalStore } = await import('react');
  const useStore = () =>
    useSyncExternalStore(store.subscribe, () => store.state.version);

  const AppKitContext = createContext<{ appKit: unknown } | undefined>(
    undefined,
  );

  return {
    AppKitContext,
    AppKitProvider: ({ children }: { children: ReactNode }) => (
      <AppKitContext.Provider value={{ appKit: { setThemeMode: () => {} } }}>
        {children}
      </AppKitContext.Provider>
    ),
    useIntentsConnectWallet: () => {
      useStore();

      return {
        family: store.state.appKitFamily,
        wallet: store.state.appKitWallet,
      };
    },
    useAppKitConnector: () => {
      useStore();

      return { ...store.state.evm };
    },
  };
});

vi.mock('@aurora-is-near/intents-connect-wallet/connect/near', async () => {
  const { useSyncExternalStore } = await import('react');

  return {
    useNearConnector: () => {
      useSyncExternalStore(store.subscribe, () => store.state.version);

      return { ...store.state.near };
    },
  };
});

vi.mock('@aurora-is-near/intents-connect-wallet/connect/stellar', async () => {
  const { useSyncExternalStore } = await import('react');

  return {
    useStellarConnector: () => {
      useSyncExternalStore(store.subscribe, () => store.state.version);

      return { ...store.state.stellar };
    },
  };
});

const loader = vi.hoisted(() => ({
  near: undefined as undefined | (() => Promise<unknown>),
  stellar: undefined as undefined | (() => Promise<unknown>),
}));

// The real chunks unless a test stands in for a load.
vi.mock('../connectors/loaders', () => ({
  connectorLoaders: {
    appKit: () => import('../connectors/AppKitConnector'),
    near: () => loader.near?.() ?? import('../connectors/NearConnector'),
    stellar: () =>
      loader.stellar?.() ?? import('../connectors/StellarConnector'),
  },
}));

const STELLAR_SESSION_KEY = '@StellarWalletsKit/activeAddress';

vi.mock('@aurora-is-near/intents-connect-wallet/near', () => ({
  toNearWalletConnector: adapters.near,
}));

vi.mock('@aurora-is-near/intents-connect-wallet/stellar', () => ({
  toStellarWalletConnector: adapters.stellar,
}));

let session: WalletSession;

function Probe() {
  session = useWallet();

  return (
    <p data-testid="probe">
      {session.isConnected ? `${session.family} ${session.address}` : 'none'}
    </p>
  );
}

const renderTree = () =>
  render(
    <ThemeProvider>
      <WalletSessionProvider>
        <Probe />
      </WalletSessionProvider>
    </ThemeProvider>,
  );

/** Renders and waits for the NEAR chunk to report in. */
const renderSession = async () => {
  renderTree();
  await waitFor(() => expect(adapters.near).toHaveBeenCalled());
};

/** Starts `connect()` and records how it settles. */
const startConnect = () => {
  const outcome: { value?: 'connected' | Error } = {};

  act(() => {
    session.connect().then(
      () => {
        outcome.value = 'connected';
      },
      (error: Error) => {
        outcome.value = error;
      },
    );
  });

  return outcome;
};

const connectNear = () =>
  store.update((s) => {
    s.near.isConnected = true;
    s.near.address = 'alice.near';
  });

beforeEach(() => {
  store.update((s) => {
    s.appKitFamily = null;
    s.appKitWallet = null;
    s.evm = store.connector('evm-solana');
    s.near = store.connector('near');
    s.stellar = store.connector('stellar');
  });
  adapters.near.mockClear();
  adapters.stellar.mockClear();
  loader.near = undefined;
  loader.stellar = undefined;
  localStorage.removeItem(STELLAR_SESSION_KEY);
});

describe('WalletSessionProvider', () => {
  it('is disconnected with no wallet until a family connects', async () => {
    await renderSession();

    expect(screen.getByTestId('probe')).toHaveTextContent('none');
    expect(session.family).toBeNull();
    expect(session.wallet).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("uses AppKit's wallet and family for the EVM/Solana row", async () => {
    const appKitWallet = { id: 'appkit-wallet' };

    store.update((s) => {
      s.evm.isConnected = true;
      s.evm.address = '0x7a3f';
      s.appKitFamily = 'sol';
      s.appKitWallet = appKitWallet;
    });
    await renderSession();

    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('sol 0x7a3f'),
    );

    expect(session.wallet).toBe(appKitWallet);
  });

  it("builds a NEAR wallet with the package's adapter", async () => {
    connectNear();
    await renderSession();

    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('near alice.near'),
    );

    expect(adapters.near).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'near', address: 'alice.near' }),
    );
    expect(session.wallet).toEqual({ id: 'near-wallet' });
  });

  it("builds a Stellar wallet from the connector's provider", async () => {
    const provider = { publicKey: 'GABC' };

    store.update((s) => {
      s.stellar.isConnected = true;
      s.stellar.address = 'GABC';
      s.stellar.getProviders = () => ({ stellar: provider });
    });
    // A saved kit session: Stellar's chunk loads at start-up.
    localStorage.setItem(STELLAR_SESSION_KEY, 'GABC');
    await renderSession();

    await waitFor(() => expect(session.family).toBe('stellar'));

    expect(adapters.stellar).toHaveBeenCalledWith({
      id: 'stellar',
      name: 'Stellar',
      address: 'GABC',
      provider,
    });
    expect(session.wallet).toEqual({ id: 'stellar-wallet' });
  });

  it('resolves connect() at once when a wallet is connected', async () => {
    connectNear();
    await renderSession();
    await waitFor(() => expect(session.isConnected).toBe(true));

    const outcome = startConnect();

    await waitFor(() => expect(outcome.value).toBe('connected'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("opens the package's modal in Borrow's theme and resolves once the picked wallet connects", async () => {
    const user = userEvent.setup();

    store.state.near.connect = vi.fn(async () => connectNear());
    await renderSession();

    const outcome = startConnect();

    expect(
      await screen.findByRole('heading', { name: 'Connect wallet' }),
    ).toHaveStyle({ textAlign: 'left' });
    expect(screen.getByRole('button', { name: /EVM \/ Solana/ })).toBeVisible();
    expect(
      await screen.findByRole('button', { name: /Stellar/ }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: /NEAR/ }));

    await waitFor(() => expect(outcome.value).toBe('connected'));

    expect(screen.getByTestId('probe')).toHaveTextContent('near alice.near');
  });

  it('rejects connect() when the modal is closed', async () => {
    const user = userEvent.setup();

    await renderSession();

    const outcome = startConnect();

    await user.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(outcome.value).toEqual(
        new Error('Wallet connection was cancelled'),
      ),
    );
  });

  it("rejects connect() with the wallet's own error", async () => {
    const user = userEvent.setup();
    const refused = new Error('User rejected');

    store.state.near.connect = vi.fn(async () => {
      throw refused;
    });
    await renderSession();

    const outcome = startConnect();

    await user.click(await screen.findByRole('button', { name: /NEAR/ }));

    await waitFor(() => expect(outcome.value).toBe(refused));
  });

  it("rejects connect() when the wallet's modal settles without a connection", async () => {
    const user = userEvent.setup();

    await renderSession();

    const outcome = startConnect();

    await user.click(await screen.findByRole('button', { name: /Stellar/ }));

    await waitFor(() =>
      expect(outcome.value).toEqual(
        new Error('Wallet connection was cancelled'),
      ),
    );
  });

  it('disconnects the connected family', async () => {
    const disconnect = vi.fn(async () => {});

    connectNear();
    store.state.near.disconnect = disconnect;
    await renderSession();
    await waitFor(() => expect(session.isConnected).toBe(true));

    await act(() => session.disconnect());

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("leaves Stellar's chunk unloaded without a saved session", async () => {
    const load = vi.fn(() => import('../connectors/StellarConnector'));

    loader.stellar = load;
    await renderSession();

    expect(load).not.toHaveBeenCalled();
  });

  it('loads Stellar when it is picked and connects it once in', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};

    loader.stellar = () =>
      new Promise((resolve) => {
        finish = () => resolve(import('../connectors/StellarConnector'));
      });
    store.state.stellar.connect = vi.fn(async () =>
      store.update((s) => {
        s.stellar.isConnected = true;
        s.stellar.address = 'GABC';
      }),
    );
    await renderSession();

    const outcome = startConnect();

    await user.click(await screen.findByRole('button', { name: /Stellar/ }));

    expect(store.state.stellar.connect).not.toHaveBeenCalled();

    await act(async () => finish());

    await waitFor(() => expect(outcome.value).toBe('connected'));

    expect(screen.getByTestId('probe')).toHaveTextContent('stellar GABC');
  });

  it("keeps the other families working and drops NEAR's row when its chunk fails to load", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('chunk missing');

    loader.near = () => Promise.reject(failure);
    renderTree();

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('NEAR wallets did not load'),
        failure,
      ),
    );

    startConnect();

    expect(
      await screen.findByRole('button', { name: /EVM \/ Solana/ }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Stellar/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /NEAR/ }),
    ).not.toBeInTheDocument();

    error.mockRestore();
  });
});
