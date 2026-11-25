import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { createAppRouter } from '../router';
import { PositionsGallery } from './PositionsGallery';

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../tests/appKitMock')).createAppKitMock(),
);

/**
 * The empty state navigates, so the gallery renders under a router of its
 * own, as the only route.
 */
const renderGallery = () => {
  const router = createRouter({
    routeTree: createRootRoute({ component: PositionsGallery }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  render(<RouterProvider router={router} />);
};

describe('PositionsGallery', () => {
  it('renders every positions state from fixtures', async () => {
    renderGallery();

    const states = await screen.findByRole('region', { name: 'My positions' });
    const state = (name: string) =>
      within(states).getByRole('region', { name });

    expect(
      within(state('Not connected')).getByRole('region', {
        name: 'Connect your wallet',
      }),
    ).toBeInTheDocument();
    expect(
      within(state('Loading')).getByRole('status', {
        name: 'Loading your positions',
      }),
    ).toBeInTheDocument();
    expect(within(state('Error')).getByRole('alert')).toHaveTextContent(
      'Couldn’t load your positions',
    );
    expect(
      within(state('Partial error')).getByText(
        'Some positions may be missing or out of date',
      ),
    ).toBeInTheDocument();
    expect(
      within(state('Empty')).getByRole('region', {
        name: 'No positions right now',
      }),
    ).toBeInTheDocument();
    expect(
      within(state('One loan')).getByRole('region', {
        name: 'WETH → USDC, Aave V3 on Base',
      }),
    ).toBeInTheDocument();
    expect(
      within(state('Two loans')).getByRole('region', { name: '2 POSITIONS' }),
    ).toBeInTheDocument();
    expect(
      within(state('Multi')).getByRole('region', { name: '4 POSITIONS' }),
    ).toBeInTheDocument();
    expect(within(state('At risk')).getByRole('alert')).toHaveTextContent(
      'Close to liquidation',
    );
    expect(
      within(state('Repaid')).getByRole('region', { name: 'Loan repaid' }),
    ).toBeInTheDocument();
    expect(
      within(state('Read-only')).getByText(/^Morpho · /),
    ).toBeInTheDocument();
  });

  it('is on /gallery in development', async () => {
    vi.stubEnv('DEV', true);

    render(
      <App
        router={createAppRouter(
          createMemoryHistory({ initialEntries: ['/gallery'] }),
        )}
      />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'My positions' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();

    vi.unstubAllEnvs();
  }, 15_000);
});
