import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, type Mock, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from '../markets/types';
import { MarketList, type MarketListProps } from './MarketList';

const market = (chain: string, chainLabel: string): LendingMarket => ({
  id: `fake:${chain}`,
  provider: 'fake',
  name: 'Aave',
  chain,
  chainId: chain === 'base' ? 8453 : 42161,
  chainLabel,
});

const BASE = market('base', 'Base');
const ARB = market('arb', 'Arbitrum');

const USD = 100_000_000n;

const wstEth = (
  overrides: Partial<CollateralReserve> = {},
): CollateralReserve => ({
  asset: '0x0000000000000000000000000000000000000001',
  symbol: 'wstETH',
  decimals: 18,
  assetId: 'nep141:wsteth',
  maxLtvBps: 7900,
  liquidationLtvBps: 8100,
  priceBase: 4_200n * USD,
  ...overrides,
});

const usdc = (overrides: Partial<BorrowReserve> = {}): BorrowReserve => ({
  asset: '0x0000000000000000000000000000000000000002',
  symbol: 'USDC',
  decimals: 6,
  assetId: 'nep141:usdc',
  variableBorrowApr: 0.0485,
  availableLiquidity: 1_200_000_000n * 10n ** 6n,
  priceBase: USD,
  ...overrides,
});

const snapshot = (
  of: LendingMarket,
  reserves: Partial<Pick<MarketSnapshot, 'collateral' | 'borrowable'>> = {},
): MarketSnapshot => ({
  market: of,
  blockNumber: 1n,
  baseCurrencyUnit: USD,
  collateral: [wstEth()],
  borrowable: [usdc()],
  ...reserves,
});

/** Base at 4.85% and Arbitrum at 4.41%, Spark's figures on the artboard. */
const SNAPSHOTS: Record<string, MarketSnapshot> = {
  [BASE.id]: snapshot(BASE),
  [ARB.id]: snapshot(ARB, {
    collateral: [wstEth({ maxLtvBps: 8000, liquidationLtvBps: 8250 })],
    borrowable: [
      usdc({
        variableBorrowApr: 0.0441,
        availableLiquidity: 356_000_000n * 10n ** 6n,
      }),
    ],
  }),
};

type FakeAdapter = LendingMarketAdapter & {
  getMarketSnapshot: Mock<LendingMarketAdapter['getMarketSnapshot']>;
};

const fakeAdapter = (
  getMarketSnapshot: LendingMarketAdapter['getMarketSnapshot'] = async (of) => {
    const found = SNAPSHOTS[of.id];

    if (!found) {
      throw new Error(`no snapshot for ${of.id}`);
    }

    return found;
  },
): FakeAdapter => ({
  id: 'fake',
  name: 'Aave',
  listMarkets: vi.fn().mockResolvedValue([BASE, ARB]),
  getMarketSnapshot: vi.fn(getMarketSnapshot),
});

const renderList = (
  adapter: LendingMarketAdapter,
  props: Partial<MarketListProps> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MarketAdaptersProvider adapters={[adapter]}>
          <MarketList layout="cards" {...props} />
        </MarketAdaptersProvider>
      </QueryClientProvider>,
    ),
  };
};

const card = (chainLabel: string) =>
  screen.getByRole('button', { name: new RegExp(`Aave ${chainLabel}`) });

const findCard = (chainLabel: string) =>
  screen.findByRole('button', { name: new RegExp(`Aave ${chainLabel}`) });

describe('MarketList', () => {
  it('shows one card skeleton per launch chain while loading', async () => {
    const adapter = fakeAdapter(() => new Promise(() => {}));

    adapter.listMarkets = () => new Promise(() => {});
    renderList(adapter);

    expect(screen.getAllByText('Loading markets')).toHaveLength(2);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names a skeleton by its market once the markets are listed', async () => {
    renderList(fakeAdapter(() => new Promise(() => {})));

    expect(await screen.findByText('Loading Aave on Base')).toBeInTheDocument();
    expect(screen.getByText('Loading Aave on Arbitrum')).toBeInTheDocument();
    expect(screen.queryByText(/\d%/)).not.toBeInTheDocument();
  });

  it('shows each market’s pair figures, formatted', async () => {
    renderList(fakeAdapter());

    const base = await findCard('Base');

    expect(base).toHaveTextContent('Aave');
    expect(base).toHaveTextContent('Base');
    expect(base).toHaveTextContent('4.85%');
    expect(base).toHaveTextContent('APR · max LTV 79%');
    expect(base).toHaveTextContent('Liq. 81% · $1.2B');

    const arb = card('Arbitrum');

    expect(arb).toHaveTextContent('4.41%');
    expect(arb).toHaveTextContent('APR · max LTV 80%');
    expect(arb).toHaveTextContent('Liq. 82.5% · $356M');
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it('tags the lowest APR as BEST and selects it by default', async () => {
    renderList(fakeAdapter());

    const arb = await findCard('Arbitrum');
    const base = card('Base');

    expect(within(arb).getByText('BEST')).toBeInTheDocument();
    expect(within(base).queryByText('BEST')).not.toBeInTheDocument();
    expect(arb).toHaveAttribute('aria-pressed', 'true');
    expect(base).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves the selection to the card the user picks', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderList(fakeAdapter(), { onSelect });

    await user.click(await findCard('Base'));

    expect(card('Base')).toHaveAttribute('aria-pressed', 'true');
    expect(card('Arbitrum')).toHaveAttribute('aria-pressed', 'false');
    expect(onSelect).toHaveBeenCalledWith(BASE.id);
  });

  it('shows a market the LTV is too high for as off, and BEST moves to the next lowest APR', async () => {
    renderList(fakeAdapter(), { disabledIds: [ARB.id] });

    const arb = await findCard('Arbitrum');
    const base = card('Base');

    expect(arb).toBeDisabled();
    expect(arb).toHaveTextContent('LTV too high, MAX 80%');
    expect(within(arb).queryByText('BEST')).not.toBeInTheDocument();
    expect(within(base).getByText('BEST')).toBeInTheDocument();
    expect(base).toHaveAttribute('aria-pressed', 'true');
  });

  it('tags no card BEST and selects none while another market is still loading', async () => {
    renderList(
      fakeAdapter((of) =>
        of.id === BASE.id
          ? Promise.resolve(snapshot(BASE))
          : new Promise(() => {}),
      ),
    );

    const base = await findCard('Base');

    expect(screen.getByText('Loading Aave on Arbitrum')).toBeInTheDocument();
    expect(within(base).queryByText('BEST')).not.toBeInTheDocument();
    expect(base).toHaveAttribute('aria-pressed', 'false');
  });

  it('follows a controlled selectedId over the BEST default', async () => {
    renderList(fakeAdapter(), { selectedId: BASE.id });

    const arb = await findCard('Arbitrum');
    const base = card('Base');

    expect(base).toHaveAttribute('aria-pressed', 'true');
    expect(arb).toHaveAttribute('aria-pressed', 'false');
    expect(within(arb).getByText('BEST')).toBeInTheDocument();
  });

  it('shows the Banner and no numbers when a read fails after an earlier success', async () => {
    let arbReads = 0;
    const adapter = fakeAdapter(async (of) => {
      if (of.id === ARB.id) {
        arbReads += 1;

        if (arbReads > 1) {
          throw new Error('RPC down');
        }
      }

      return SNAPSHOTS[of.id] as MarketSnapshot;
    });

    const { queryClient } = renderList(adapter);

    expect(await findCard('Arbitrum')).toHaveTextContent('4.41%');

    await act(() =>
      queryClient.refetchQueries({
        queryKey: ['market-snapshot', 'fake', ARB.id],
      }),
    );

    const banner = await screen.findByRole('alert');

    expect(banner).toHaveTextContent('Aave on Arbitrum did not load');
    expect(screen.queryByText(/4\.41%/)).not.toBeInTheDocument();
    expect(card('Base')).toHaveTextContent('4.85%');
  });

  it('shows a Banner for the failed market only, and "Try again" reads it again', async () => {
    const user = userEvent.setup();
    let arbFailures = 1;
    const adapter = fakeAdapter(async (of) => {
      if (of.id === ARB.id && arbFailures > 0) {
        arbFailures -= 1;
        throw new Error('RPC down');
      }

      return SNAPSHOTS[of.id] as MarketSnapshot;
    });

    renderList(adapter);

    const banner = await screen.findByRole('alert');

    expect(banner).toHaveTextContent('Aave on Arbitrum did not load');
    expect(banner).not.toHaveTextContent(/\d/);
    expect(
      screen.queryByRole('button', { name: /Aave Arbitrum/ }),
    ).not.toBeInTheDocument();
    expect(card('Base')).toHaveTextContent('4.85%');

    await user.click(within(banner).getByRole('button', { name: 'Try again' }));

    expect(await findCard('Arbitrum')).toHaveTextContent('4.41%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(adapter.getMarketSnapshot.mock.calls.map(([of]) => of.id)).toEqual([
      BASE.id,
      ARB.id,
      ARB.id,
    ]);
  });

  it('shows a Banner with a retry when the market list fails', async () => {
    const user = userEvent.setup();
    const adapter = fakeAdapter();

    adapter.listMarkets = vi
      .fn()
      .mockRejectedValueOnce(new Error('list down'))
      .mockResolvedValue([BASE]);
    renderList(adapter);

    const banner = await screen.findByRole('alert');

    expect(banner).toHaveTextContent('The markets did not load');

    await user.click(within(banner).getByRole('button', { name: 'Try again' }));

    expect(await findCard('Base')).toHaveTextContent('4.85%');
  });

  it('leaves out a market that lacks the pair', async () => {
    renderList(
      fakeAdapter(async (of) =>
        of.id === ARB.id
          ? snapshot(ARB, { borrowable: [usdc({ symbol: 'USDT' })] })
          : snapshot(BASE),
      ),
    );

    await findCard('Base');

    await waitFor(() =>
      expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument(),
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('says so when no market has the pair', async () => {
    renderList(
      fakeAdapter(async (of) =>
        snapshot(of, {
          collateral: of.id === BASE.id ? [] : [wstEth({ unavailable: true })],
        }),
      ),
    );

    expect(
      await screen.findByText('No market offers wstETH / USDC right now.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
