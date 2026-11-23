import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { createAppRouter } from './router';

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () => {
  const { createContext } = await import('react');

  return {
    AppKitContext: createContext(undefined),
    AppKitProvider: ({ children }: { children: ReactNode }) => children,
    useIntentsConnectWallet: () => ({
      address: undefined,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
});

const renderAt = (path: string, dev: boolean) => {
  vi.stubEnv('DEV', dev);

  const history = createMemoryHistory({ initialEntries: [path] });

  render(<App router={createAppRouter(history)} />);

  return history;
};

describe('/gallery', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the real gallery under the app theme when DEV is true', async () => {
    renderAt('/gallery', true);

    expect(
      await screen.findByRole('heading', { name: 'UI kit playground' }),
    ).toBeInTheDocument();
  });

  it('is not a route when DEV is false: it redirects to /', async () => {
    const history = renderAt('/gallery', false);

    await screen.findByRole('tablist', { name: 'Borrow views' });
    await waitFor(() => expect(history.location.pathname).toBe('/'));

    expect(screen.queryByText('UI kit playground')).not.toBeInTheDocument();
  });
});
