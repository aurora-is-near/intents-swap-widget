import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { createAppRouter } from '@/router';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

// AppKit is replaced by a stub whose wallet state each test sets.
vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('@/tests/appKitMock')).createAppKitMock(wallet),
);

// The New loan tab reads markets through a fake Aave adapter with fixed
// snapshots (Base 4.85%, Arbitrum 4.41%), so these tests stay offline.
vi.mock('@/domains/markets/aaveV3', async () =>
  (await import('@/tests/aaveV3Mock')).createAaveV3Mock(),
);

// The New loan form reads wallet balances through the SDK's hooks; they are
// replaced by empty results, so no chain or token list is read.
vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('@/tests/balancesMock')).createBalancesMock(importOriginal),
);

const ADDRESS = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

const setConnected = (connected: boolean) => {
  wallet.isConnected = connected;
  wallet.address = connected ? ADDRESS : undefined;
};

const renderApp = async (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });

  render(<App router={createAppRouter(history)} />);
  await screen.findByRole('tablist', { name: 'Borrow views' });

  return { history };
};

/** The selected tab's panel, so the header's wallet button is not matched. */
const panel = () => screen.getByRole('tabpanel');

describe('New loan tab', () => {
  beforeEach(() => {
    setConnected(false);
    wallet.connect.mockReset().mockResolvedValue(undefined);
    wallet.disconnect.mockReset().mockResolvedValue(undefined);
  });

  it('shows the loan form and a connect CTA with the Aave chip while disconnected', async () => {
    const user = userEvent.setup();

    await renderApp('/');

    expect(
      within(panel()).getByRole('region', { name: 'Loan details' }),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByRole('region', { name: 'Markets' }),
    ).toBeInTheDocument();

    const cta = within(panel()).getByRole('button', {
      name: 'Connect wallet to borrow on Aave',
    });

    await user.click(cta);

    expect(wallet.connect).toHaveBeenCalledTimes(1);
  });

  it('shows the market card’s figures and the summary for the selected market', async () => {
    await renderApp('/');

    const markets = within(panel()).getByRole('region', { name: 'Markets' });
    const aave = await within(markets).findByRole('button', {
      name: /\bAave 4\.41%/,
    });

    expect(aave).toHaveTextContent('4.41%');
    expect(aave).toHaveTextContent('Liq. 82.5% · $356M');

    const tiles = within(markets).getAllByRole('definition');

    // Aave on Arbitrum at the starting LTV of 50%, with no amount yet: no
    // liquidation price, its liquidation LTV beneath, health 82.5 ÷ 50.
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      '50%',
      '—at 82.5% LTV',
      '1.65',
    ]);
  });

  it('keeps the loan form and asks for an amount while connected', async () => {
    setConnected(true);

    await renderApp('/');

    expect(
      within(panel()).getByRole('region', { name: 'Loan details' }),
    ).toBeInTheDocument();

    await within(panel()).findByRole('button', { name: /\bAave 4\.41%/ });

    expect(
      within(panel()).queryByRole('button', {
        name: 'Connect wallet to borrow on Aave',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(panel()).getByRole('button', { name: 'Enter an amount' }),
    ).toBeDisabled();
  });
});

describe('My positions tab', () => {
  beforeEach(() => {
    setConnected(false);
    wallet.connect.mockReset().mockResolvedValue(undefined);
    wallet.disconnect.mockReset().mockResolvedValue(undefined);
  });

  it('asks to connect while disconnected, and the button opens the connect flow', async () => {
    const user = userEvent.setup();

    await renderApp('/positions');

    const card = within(panel()).getByRole('region', {
      name: 'Connect your wallet',
    });

    expect(card).toHaveTextContent(
      'Connect to see your loans across Morpho, Aave and Spark.',
    );

    await user.click(
      within(card).getByRole('button', { name: 'Connect wallet' }),
    );

    expect(wallet.connect).toHaveBeenCalledTimes(1);
  });

  it('does not surface a cancelled connection as an error', async () => {
    const user = userEvent.setup();

    wallet.connect.mockRejectedValue(new Error('cancelled'));
    await renderApp('/positions');

    await user.click(
      within(panel()).getByRole('button', { name: 'Connect wallet' }),
    );

    expect(wallet.connect).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state while connected, and "Make a loan" goes to New loan', async () => {
    const user = userEvent.setup();

    setConnected(true);

    const { history } = await renderApp('/positions');

    const card = within(panel()).getByRole('region', {
      name: 'No positions right now',
    });

    expect(card).toHaveTextContent(
      'Make a loan and it will show up here with its LTV, health and repay options.',
    );

    await user.click(within(card).getByRole('button', { name: 'Make a loan' }));

    await waitFor(() => expect(history.location.pathname).toBe('/'));

    expect(screen.getByRole('tab', { name: 'New loan' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'New loan' })).toHaveFocus(),
    );

    expect(wallet.connect).not.toHaveBeenCalled();
  });
});

describe('Footer', () => {
  beforeEach(() => {
    setConnected(false);
  });

  it('shows only the logo, tagline and copyright, with no links', async () => {
    await renderApp('/');

    const footer = screen.getByRole('contentinfo');

    expect(
      within(footer).getByRole('img', { name: 'Aurora Intents' }),
    ).toBeInTheDocument();
    expect(footer).toHaveTextContent(
      'Borrow, swap and earn on any chain from one signature.',
    );
    expect(footer).toHaveTextContent('© 2026 Aurora. All rights reserved.');
    expect(within(footer).queryAllByRole('link')).toHaveLength(0);
    expect(within(footer).queryAllByRole('button')).toHaveLength(0);
    expect(footer.querySelectorAll('a')).toHaveLength(0);
  });
});
