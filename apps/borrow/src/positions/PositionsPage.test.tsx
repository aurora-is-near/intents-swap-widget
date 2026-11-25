import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { intentsConnectApi } from '../config';
import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import { createAppRouter } from '../router';
import type { LendingMarketAdapter } from '../markets/types';
import { createFakeAdapter, createTestQueryClient } from '../tests/fakeMarkets';
import {
  AAVE_BASE,
  createFakePositionsReader,
  EVM_WALLET,
  type FakePositionsReader,
  INTERMEDIARY,
  loanPosition,
} from '../tests/fakePositions';
import { PositionsPage } from './PositionsPage';
import { PositionsReaderProvider } from './PositionsReaderProvider';

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

/**
 * The page on its own, with no retries, so a failed read shows at once. With
 * no market adapters (the default), only the wallet-wide reads run.
 */
const renderPage = (
  reader: FakePositionsReader,
  adapters: LendingMarketAdapter[] = [],
) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MarketAdaptersProvider adapters={adapters}>
        <PositionsReaderProvider reader={reader}>
          {children}
        </PositionsReaderProvider>
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  return { queryClient, ...render(<PositionsPage />, { wrapper }) };
};

/** The whole app on `/positions`, for the states that link elsewhere. */
const renderApp = async (reader: FakePositionsReader) => {
  render(
    <App
      positionsReader={reader}
      router={createAppRouter(
        createMemoryHistory({ initialEntries: ['/positions'] }),
      )}
    />,
  );
  await screen.findByRole('tablist', { name: 'Borrow views' });
};

describe('PositionsPage', () => {
  beforeEach(() => {
    wallet.address = EVM_WALLET;
    wallet.isConnected = true;
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

  it('asks to connect while disconnected', async () => {
    wallet.address = undefined;
    wallet.isConnected = false;

    await renderApp(createFakePositionsReader());

    expect(
      await screen.findByRole('region', { name: 'Connect your wallet' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state, linking to New loan, when there are no loans', async () => {
    const reader = createFakePositionsReader();

    await renderApp(reader);

    const card = await screen.findByRole('region', {
      name: 'No positions right now',
    });

    expect(
      within(card).getByRole('button', { name: 'Make a loan' }),
    ).toBeInTheDocument();
    expect(reader.readOwnerPositions).toHaveBeenCalledWith(INTERMEDIARY);
  });

  it('shows placeholders while the first read is under way', async () => {
    renderPage(
      createFakePositionsReader({
        readOwnerPositions: () => new Promise<never>(() => {}),
      }),
    );

    expect(
      await screen.findByRole('status', { name: 'Loading your positions' }),
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error card with Retry when nothing could be read, and Retry reads again', async () => {
    const user = userEvent.setup();
    const reader = createFakePositionsReader({
      readOwnerPositions: async () => {
        throw new Error('403');
      },
    });

    renderPage(reader);

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Couldn’t load your positions');
    expect(alert).toHaveTextContent(
      'We could not read the loans of 0x0000…00aa, the loans of 0x7a3f…9c21.',
    );
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    reader.readOwnerPositions.mockImplementation(async (owner) =>
      owner === INTERMEDIARY ? [ACTIVE] : [],
    );
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('region', {
        name: 'WETH → USDC, Aave V3 on Base',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists one card per loan', async () => {
    renderPage(
      createFakePositionsReader({
        readOwnerPositions: async (owner) =>
          owner === INTERMEDIARY ? [ACTIVE] : [AT_RISK],
      }),
    );

    expect(
      await screen.findByRole('region', {
        name: 'WETH → USDC, Aave V3 on Base',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', {
        name: 'WETH → USDC, Aave V3 on Arbitrum',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Close to liquidation');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps what loaded under a notice with Retry when one read fails', async () => {
    const user = userEvent.setup();
    const reader = createFakePositionsReader({
      readOwnerPositions: async (owner) => {
        if (owner === INTERMEDIARY) {
          return [ACTIVE];
        }

        throw new Error('403');
      },
    });

    renderPage(reader);

    await screen.findByText('Some positions may be missing or out of date');

    const notice = screen.getByRole('status');

    expect(notice).toHaveTextContent(
      'We could not read the loans of 0x7a3f…9c21.',
    );
    expect(
      screen.getByRole('region', { name: 'WETH → USDC, Aave V3 on Base' }),
    ).toBeInTheDocument();

    reader.readOwnerPositions.mockClear();
    await user.click(within(notice).getByRole('button', { name: 'Retry' }));

    expect(reader.readOwnerPositions).toHaveBeenCalledWith(EVM_WALLET);
  });

  it('keeps the loans shown when a refetch fails', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: async (owner) =>
        owner === INTERMEDIARY ? [ACTIVE] : [],
    });

    const { queryClient } = renderPage(reader);

    await screen.findByRole('region', {
      name: 'WETH → USDC, Aave V3 on Base',
    });

    reader.readOwnerPositions.mockRejectedValue(new Error('down'));
    await act(() => queryClient.invalidateQueries({ queryKey: ['positions'] }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Some positions may be missing or out of date',
      ),
    );

    expect(
      screen.getByRole('region', { name: 'WETH → USDC, Aave V3 on Base' }),
    ).toBeInTheDocument();
  });

  it('names failed market reads in words, never by their market ids', async () => {
    renderPage(
      createFakePositionsReader({
        readOwnerPositions: async (owner) =>
          owner === INTERMEDIARY ? [{ ...ACTIVE, liquidationLtv: null }] : [],
        readMarketPosition: async () => {
          throw new Error('403');
        },
        readMarketRisk: async () => {
          throw new Error('403');
        },
      }),
      [
        createFakeAdapter({
          id: 'aave-v3',
          listMarkets: async () => [AAVE_BASE],
        }),
      ],
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'We could not read repaid loans, some risk figures.',
      ),
    );

    const notice = screen.getByRole('status');

    expect(notice).not.toHaveTextContent(AAVE_BASE.id);
    expect(notice).not.toHaveTextContent(ACTIVE.marketId);
  });
});
