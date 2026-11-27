import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { createAppRouter } from '@/router';
import { THEME_STORAGE_KEY } from '@/constants';

// The shell mounts the wallet session and the header's wallet button; the
// shell tests run without a wallet, so the session is a disconnected stub.
vi.mock('@/domains/wallet/hooks/useWallet', async () =>
  (await import('@/tests/walletMock')).createWalletMock(),
);

vi.mock('@/domains/wallet/providers/WalletProvider', async () =>
  (await import('@/tests/walletMock')).createWalletProviderMock(),
);

// The New loan tab reads markets through a fake Aave adapter with fixed
// snapshots, so these tests stay offline and still show the market cards.
vi.mock('@/domains/markets/aaveV3', async () =>
  (await import('@/tests/aaveV3Mock')).createAaveV3Mock(),
);

// The New loan form reads wallet balances through the SDK's hooks; they are
// replaced by empty results, so no chain or token list is read.
vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('@/tests/balancesMock')).createBalancesMock(importOriginal),
);

const renderApp = async (path = '/') => {
  const history = createMemoryHistory({ initialEntries: [path] });

  render(<App router={createAppRouter(history)} />);
  await screen.findByRole('tablist', { name: 'Borrow views' });

  return { history };
};

const tab = (name: string) => screen.getByRole('tab', { name });

describe('App', () => {
  it('renders the shell under ThemeProvider', async () => {
    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(
      within(screen.getByRole('banner')).getByRole('img', {
        name: 'Aurora Intents',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'One click borrow' }),
    ).toBeInTheDocument();
  });

  it('puts the wallet button in the header', async () => {
    await renderApp();

    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Connect wallet',
      }),
    ).toBeInTheDocument();
  });

  it('shows only the Borrow section in the header', async () => {
    await renderApp();

    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Borrow');
    expect(links[0]).toHaveAttribute('aria-current', 'page');

    [/swap/i, /earn/i, /docs/i, /^x$/i].forEach((name) => {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    });
  });

  it('selects New loan at /', async () => {
    await renderApp('/');

    expect(tab('New loan')).toHaveAttribute('aria-selected', 'true');
    expect(tab('My positions')).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the adapter’s markets as one card per provider on the New loan tab', async () => {
    await renderApp('/');

    const panel = screen.getByRole('tabpanel');
    const aave = await within(panel).findByRole('button', {
      name: /\bAave 4\.41%/,
    });

    // Arbitrum, the lower APR of Aave's two chains.
    expect(aave).toHaveTextContent('4.41%');
    expect(aave).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(panel).queryByRole('button', { name: /\bAave 4\.85%/ }),
    ).not.toBeInTheDocument();
  });

  it('selects My positions at /positions', async () => {
    await renderApp('/positions');

    expect(tab('My positions')).toHaveAttribute('aria-selected', 'true');
    expect(tab('New loan')).toHaveAttribute('aria-selected', 'false');
  });

  it('hides the positions count while there is none', async () => {
    await renderApp('/positions');

    expect(tab('My positions')).toHaveAccessibleName('My positions');
  });

  it('redirects an unknown path to /', async () => {
    const { history } = await renderApp('/no-such-page');

    await waitFor(() => expect(history.location.pathname).toBe('/'));

    expect(tab('New loan')).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates when a tab is clicked', async () => {
    const user = userEvent.setup();
    const { history } = await renderApp('/');

    await user.click(tab('My positions'));

    await waitFor(() => expect(history.location.pathname).toBe('/positions'));

    expect(tab('My positions')).toHaveAttribute('aria-selected', 'true');

    await user.click(tab('New loan'));

    await waitFor(() => expect(history.location.pathname).toBe('/'));

    expect(tab('New loan')).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the scroll position when a tab is clicked', async () => {
    const user = userEvent.setup();
    const { history } = await renderApp('/');
    const scrollTo = vi.spyOn(window, 'scrollTo');

    await user.click(tab('My positions'));

    await waitFor(() => expect(history.location.pathname).toBe('/positions'));

    expect(scrollTo).not.toHaveBeenCalled();

    scrollTo.mockRestore();
  });

  it('flips the theme and its label with the theme toggle', async () => {
    const user = userEvent.setup();

    await renderApp();

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();
  });
});
