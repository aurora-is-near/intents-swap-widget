import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { intentsConnectApi } from '../config';
import { createAppRouter } from '../router';
import {
  createFakePositionsReader,
  EVM_WALLET,
  INTERMEDIARY,
  loanPosition,
} from '../tests/fakePositions';

/* The wallet's loans above the New loan form, linking to My positions. */

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  family: 'evm' as const,
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('../markets/aaveV3', async () =>
  (await import('../tests/aaveV3Mock')).createAaveV3Mock(),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('../tests/balancesMock')).createBalancesMock(importOriginal),
);

const ACTIVE = loanPosition();
const AT_RISK = loanPosition({
  owner: EVM_WALLET,
  network: 'arbitrum',
  marketId: 'aave-v3-arbitrum',
  chainLabel: 'Arbitrum',
  health: 1.08,
  status: 'at-risk',
});

const renderNewLoan = (positions: ReturnType<typeof loanPosition>[]) => {
  const history = createMemoryHistory({ initialEntries: ['/'] });

  render(
    <App
      positionsReader={createFakePositionsReader({
        readOwnerPositions: async (owner) =>
          positions.filter((position) => position.owner === owner),
      })}
      router={createAppRouter(history)}
    />,
  );

  return history;
};

describe('NewLoanPage positions block', () => {
  beforeEach(() => {
    vi.spyOn(intentsConnectApi, 'getIntermediary').mockResolvedValue({
      originAccount: EVM_WALLET,
      originType: 'evm',
      evm: INTERMEDIARY,
      solana: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the summary, with no card pressed, once the wallet has loans', async () => {
    renderNewLoan([ACTIVE, AT_RISK]);

    const summary = await screen.findByRole('region', {
      name: '2 POSITIONS',
    });

    expect(summary).toHaveTextContent('Total debt $3,000 · collateral $6,000');

    within(summary)
      .getAllByRole('button')
      .forEach((card) => {
        expect(card).toHaveAttribute('aria-pressed', 'false');
      });
  });

  it('shows one loan too', async () => {
    renderNewLoan([ACTIVE]);

    expect(
      await screen.findByRole('region', { name: '1 POSITION' }),
    ).toBeInTheDocument();
  });

  it('has no block without loans', async () => {
    const reader = createFakePositionsReader();

    render(
      <App
        positionsReader={reader}
        router={createAppRouter(createMemoryHistory({ initialEntries: ['/'] }))}
      />,
    );

    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledWith(INTERMEDIARY),
    );

    expect(screen.queryByText(/POSITIONS?$/)).not.toBeInTheDocument();
  });

  it('opens the picked loan on My positions with the position param', async () => {
    const user = userEvent.setup();
    const history = renderNewLoan([ACTIVE, AT_RISK]);

    await user.click(
      await screen.findByRole('button', { name: /Aave V3 · Base/ }),
    );

    await waitFor(() => expect(history.location.pathname).toBe('/positions'));

    expect(new URLSearchParams(history.location.search).get('position')).toBe(
      ACTIVE.id,
    );
    expect(
      await screen.findByRole('region', {
        name: 'WETH → USDC, Aave V3 on Base',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Aave V3 · Base/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /My positions/ })).toHaveFocus();
  });
});
