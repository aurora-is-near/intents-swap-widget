import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import type { LendingMarketAdapter } from '../markets/types';
import {
  FAKE_ARB as ARB,
  FAKE_BASE as BASE,
  createFakeAdapter,
  createFakeSparkAdapter,
  createTestQueryClient,
  readFakeSnapshot,
  pairSnapshot as snapshot,
  usdc,
  weth,
} from '../tests/fakeMarkets';
import { MarketList, type MarketListProps } from './MarketList';

/** The fake markets' pair. */
const PAIR = { collateral: 'WETH', borrow: 'USDC' };

/** The fake Aave adapter's provider, on Base and Arbitrum. */
const AAVE = BASE.provider;

const fakeAdapter = (
  getMarketSnapshot?: LendingMarketAdapter['getMarketSnapshot'],
) => createFakeAdapter({ getMarketSnapshot });

/** An adapter whose read of each market fails `times` times, then succeeds. */
const failingAdapter = (failures: Record<string, number>) =>
  fakeAdapter(async (of) => {
    const left = failures[of.id] ?? 0;

    if (left > 0) {
      failures[of.id] = left - 1;
      throw new Error('RPC down');
    }

    return readFakeSnapshot(of);
  });

const renderList = (
  adapters: LendingMarketAdapter | LendingMarketAdapter[],
  props: Partial<MarketListProps> = {},
) => {
  const queryClient = createTestQueryClient();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MarketAdaptersProvider
          adapters={Array.isArray(adapters) ? adapters : [adapters]}>
          <MarketList layout="cards" pair={PAIR} {...props} />
        </MarketAdaptersProvider>
      </QueryClientProvider>,
    ),
  };
};

/** A provider's card, named by its chosen chain. */
const card = (name: string, chainLabel: string) =>
  screen.getByRole('button', { name: new RegExp(`${name} on ${chainLabel}`) });

const findCard = (name: string, chainLabel: string) =>
  screen.findByRole('button', {
    name: new RegExp(`${name} on ${chainLabel}`),
  });

/** Every read has settled. */
const settled = () =>
  waitFor(() => expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument());

describe('MarketList', () => {
  it('shows one card skeleton per launch provider while loading', async () => {
    const adapter = createFakeAdapter({
      listMarkets: () => new Promise(() => {}),
      getMarketSnapshot: () => new Promise(() => {}),
    });

    renderList(adapter);

    expect(screen.getAllByText('Loading markets')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names a skeleton by its provider once the markets are listed', async () => {
    renderList(fakeAdapter(() => new Promise(() => {})));

    expect(await screen.findByText('Loading Aave')).toBeInTheDocument();
    expect(screen.getAllByText(/^Loading/)).toHaveLength(1);
    expect(screen.queryByText(/\d%/)).not.toBeInTheDocument();
  });

  it('shows one Aave card for Base and Arbitrum, on the chosen chain, with its figures', async () => {
    renderList(fakeAdapter());

    // Arbitrum, the lower APR.
    const aave = await findCard('Aave', 'Arbitrum');

    await settled();

    expect(screen.getAllByRole('button')).toEqual([aave]);
    expect(aave).toHaveTextContent('on Arbitrum');
    expect(aave).toHaveTextContent('4.41%');
    expect(aave).toHaveTextContent('APR · max LTV 80%');
    expect(aave).toHaveTextContent('Liq. 82.5% · $356M');
    expect(aave).not.toHaveTextContent('Base');
  });

  it('shows one tile for a provider whose chains two adapters list', async () => {
    renderList([
      createFakeAdapter({ listMarkets: () => Promise.resolve([BASE]) }),
      createFakeAdapter({
        id: 'other',
        listMarkets: () => Promise.resolve([ARB]),
      }),
    ]);

    const aave = await findCard('Aave', 'Arbitrum');

    await settled();

    expect(screen.getAllByRole('button')).toEqual([aave]);
  });

  it('moves to the chain that can lend the loan when the cheaper one cannot', async () => {
    // $400M: above Arbitrum's $356M, within Base's $1.2B.
    renderList(fakeAdapter(), { loanUsd: 400_000_000 });

    const aave = await findCard('Aave', 'Base');

    expect(aave).toHaveTextContent('4.85%');
    expect(aave).toHaveTextContent('Liq. 81% · $1.2B');
    expect(
      screen.queryByRole('button', { name: /on Arbitrum/ }),
    ).not.toBeInTheDocument();
  });

  it('tags no card BEST with one provider, and selects it by default', async () => {
    renderList(fakeAdapter());

    const aave = await findCard('Aave', 'Arbitrum');

    expect(within(aave).queryByText('BEST')).not.toBeInTheDocument();
    expect(aave).toHaveAttribute('aria-pressed', 'true');
  });

  it('tags the lowest-APR provider BEST with two providers, and selects it', async () => {
    renderList([fakeAdapter(), createFakeSparkAdapter()]);

    const aave = await findCard('Aave', 'Arbitrum');
    const spark = await findCard('Spark', 'Base');

    expect(within(aave).getByText('BEST')).toBeInTheDocument();
    expect(within(spark).queryByText('BEST')).not.toBeInTheDocument();
    expect(aave).toHaveAttribute('aria-pressed', 'true');
    expect(spark).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves the selection to the provider the user picks', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderList([fakeAdapter(), createFakeSparkAdapter()], { onSelect });

    await findCard('Aave', 'Arbitrum');
    await user.click(await findCard('Spark', 'Base'));

    expect(card('Spark', 'Base')).toHaveAttribute('aria-pressed', 'true');
    expect(card('Aave', 'Arbitrum')).toHaveAttribute('aria-pressed', 'false');
    expect(onSelect).toHaveBeenCalledWith('spark');
  });

  it('shows a provider the LTV is too high for as off, and BEST moves to the next lowest APR', async () => {
    renderList([fakeAdapter(), createFakeSparkAdapter()], {
      disabledIds: [AAVE],
    });

    const aave = await findCard('Aave', 'Arbitrum');
    const spark = await findCard('Spark', 'Base');

    expect(aave).toBeDisabled();
    expect(aave).toHaveTextContent('LTV too high, MAX 80%');
    expect(within(aave).queryByText('BEST')).not.toBeInTheDocument();
    expect(within(spark).getByText('BEST')).toBeInTheDocument();
    expect(spark).toHaveAttribute('aria-pressed', 'true');
  });

  it('tags no card BEST and selects none while another provider is still loading', async () => {
    renderList([
      fakeAdapter(),
      createFakeSparkAdapter(() => new Promise(() => {})),
    ]);

    const aave = await findCard('Aave', 'Arbitrum');

    expect(screen.getByText('Loading Spark')).toBeInTheDocument();
    expect(within(aave).queryByText('BEST')).not.toBeInTheDocument();
    expect(aave).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the provider’s skeleton while one of its chains is still pending', async () => {
    let loadArbitrum: () => void = () => {};
    const arbitrumLoaded = new Promise<void>((resolve) => {
      loadArbitrum = resolve;
    });

    renderList(
      fakeAdapter(async (of) => {
        if (of.id === ARB.id) {
          await arbitrumLoaded;
        }

        return readFakeSnapshot(of);
      }),
    );

    expect(await screen.findByText('Loading Aave')).toBeInTheDocument();

    // Base has loaded, but its figures would jump once Arbitrum does.
    await waitFor(() =>
      expect(screen.queryByText(/\d%/)).not.toBeInTheDocument(),
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    loadArbitrum();

    expect(await findCard('Aave', 'Arbitrum')).toHaveTextContent('4.41%');
  });

  it('follows a controlled selectedId over the BEST default', async () => {
    renderList([fakeAdapter(), createFakeSparkAdapter()], {
      selectedId: 'spark',
    });

    const aave = await findCard('Aave', 'Arbitrum');
    const spark = await findCard('Spark', 'Base');

    expect(spark).toHaveAttribute('aria-pressed', 'true');
    expect(aave).toHaveAttribute('aria-pressed', 'false');
    expect(within(aave).getByText('BEST')).toBeInTheDocument();
  });

  it('shows the tile from the chain that loaded, and no Banner, when one chain fails', async () => {
    // Arbitrum's read and its one retry.
    renderList(failingAdapter({ [ARB.id]: 2 }));

    const aave = await findCard('Aave', 'Base');

    await settled();

    expect(aave).toHaveTextContent('4.85%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('drops a chain’s numbers when its read fails after an earlier success', async () => {
    let arbReads = 0;
    const adapter = fakeAdapter(async (of) => {
      if (of.id === ARB.id) {
        arbReads += 1;

        if (arbReads > 1) {
          throw new Error('RPC down');
        }
      }

      return readFakeSnapshot(of);
    });

    const { queryClient } = renderList(adapter);

    expect(await findCard('Aave', 'Arbitrum')).toHaveTextContent('4.41%');

    await act(() =>
      queryClient.refetchQueries({
        queryKey: ['market-snapshot', 'fake', ARB.id],
      }),
    );

    expect(await findCard('Aave', 'Base')).toHaveTextContent('4.85%');
    expect(screen.queryByText(/4\.41%/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows one Banner when every chain of a provider fails, and "Try again" reads each again', async () => {
    const user = userEvent.setup();
    // Each chain's read and its one retry.
    const adapter = failingAdapter({ [BASE.id]: 2, [ARB.id]: 2 });

    renderList(adapter);

    const banner = await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(banner).toHaveTextContent('Aave did not load');
    expect(banner).not.toHaveTextContent(/\d/);
    expect(
      screen.queryByRole('button', { name: /^Aave/ }),
    ).not.toBeInTheDocument();

    await user.click(within(banner).getByRole('button', { name: 'Try again' }));

    expect(await findCard('Aave', 'Arbitrum')).toHaveTextContent('4.41%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const reads = adapter.getMarketSnapshot.mock.calls.map(([of]) => of.id);

    expect(reads.filter((id) => id === BASE.id)).toHaveLength(3);
    expect(reads.filter((id) => id === ARB.id)).toHaveLength(3);
  });

  it('shows the Banner when a chain fails and the one that loaded lacks the pair', async () => {
    renderList(
      fakeAdapter(async (of) => {
        if (of.id === ARB.id) {
          throw new Error('RPC down');
        }

        return snapshot(BASE, { borrowable: [usdc({ symbol: 'USDT' })] });
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Aave did not load',
    );
    expect(screen.queryByText(/^No market offers/)).not.toBeInTheDocument();
  });

  it('shows a Banner with a retry when the market list fails', async () => {
    const user = userEvent.setup();
    const adapter = fakeAdapter();

    adapter.listMarkets
      .mockRejectedValueOnce(new Error('list down'))
      .mockResolvedValue([BASE]);
    renderList(adapter);

    const banner = await screen.findByRole('alert');

    expect(banner).toHaveTextContent('The markets did not load');

    await user.click(within(banner).getByRole('button', { name: 'Try again' }));

    expect(await findCard('Aave', 'Base')).toHaveTextContent('4.85%');
  });

  it('leaves a chain that lacks the pair out of the choice', async () => {
    renderList(
      fakeAdapter(async (of) =>
        of.id === ARB.id
          ? snapshot(ARB, { borrowable: [usdc({ symbol: 'USDT' })] })
          : snapshot(BASE),
      ),
    );

    const aave = await findCard('Aave', 'Base');

    await settled();

    expect(screen.getAllByRole('button')).toEqual([aave]);
  });

  it('reads every row for the pair it is given', async () => {
    renderList(
      fakeAdapter(async (of) =>
        of.id === BASE.id
          ? snapshot(BASE, {
              borrowable: [
                usdc(),
                usdc({ symbol: 'USDT', variableBorrowApr: 0.051 }),
              ],
            })
          : snapshot(of),
      ),
      { pair: { collateral: 'WETH', borrow: 'USDT' } },
    );

    const aave = await findCard('Aave', 'Base');

    await settled();

    expect(aave).toHaveTextContent('5.10%');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('names the pair it is given when no market has it', async () => {
    renderList(fakeAdapter(), { pair: { collateral: 'WETH', borrow: 'GHO' } });

    expect(
      await screen.findByText('No market offers WETH / GHO right now.'),
    ).toBeInTheDocument();
  });

  it('says so when no market has the pair', async () => {
    renderList(
      fakeAdapter(async (of) =>
        snapshot(of, {
          collateral: of.id === BASE.id ? [] : [weth({ unavailable: true })],
        }),
      ),
    );

    expect(
      await screen.findByText('No market offers WETH / USDC right now.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('MarketList, table layout', () => {
  const AAVE_NAME = /^Aave (BEST |LTV TOO HIGH )?on Arbitrum/;
  const SPARK_NAME = /^Spark (BEST |LTV TOO HIGH )?on Base/;

  const row = (name: RegExp) => screen.getByRole('button', { name });

  it('shows the five column headers', async () => {
    renderList(fakeAdapter(), { layout: 'table' });

    await screen.findByRole('button', { name: AAVE_NAME });

    ['Market', 'Borrow APR', 'Max LTV', 'Liquidation', 'Liquidity'].forEach(
      (name) =>
        expect(
          screen.getByText(name, { selector: '[aria-hidden="true"] > span' }),
        ).toBeInTheDocument(),
    );
  });

  it('shows one row for Aave on Base and Arbitrum, with the chosen chain under the name', async () => {
    renderList(fakeAdapter(), { layout: 'table' });

    const aave = await screen.findByRole('button', { name: AAVE_NAME });

    await settled();

    expect(screen.getAllByRole('button')).toEqual([aave]);

    const cells = within(aave);

    expect(cells.getByText('Aave')).toBeInTheDocument();
    expect(cells.getByText(/on Arbitrum/)).toBeInTheDocument();
    expect(cells.getByText('4.41%')).toBeInTheDocument();
    expect(cells.getByText('80%')).toBeInTheDocument();
    expect(cells.getByText('82.5%')).toBeInTheDocument();
    expect(cells.getByText('$356M')).toBeInTheDocument();
  });

  it('tags no row BEST with one provider', async () => {
    renderList(fakeAdapter(), { layout: 'table' });

    const aave = await screen.findByRole('button', { name: AAVE_NAME });

    expect(within(aave).queryByText('BEST')).not.toBeInTheDocument();
    expect(aave).toHaveAttribute('aria-pressed', 'true');
  });

  it('tags the lowest-APR provider BEST, selects it, and moves the selection on a click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderList([fakeAdapter(), createFakeSparkAdapter()], {
      layout: 'table',
      onSelect,
    });
    await screen.findByRole('button', { name: AAVE_NAME });
    await screen.findByRole('button', { name: SPARK_NAME });

    expect(within(row(AAVE_NAME)).getByText('BEST')).toBeInTheDocument();
    expect(within(row(SPARK_NAME)).queryByText('BEST')).not.toBeInTheDocument();
    expect(row(AAVE_NAME)).toHaveAttribute('aria-pressed', 'true');

    await user.click(row(SPARK_NAME));

    expect(row(SPARK_NAME)).toHaveAttribute('aria-pressed', 'true');
    expect(onSelect).toHaveBeenCalledWith('spark');
  });

  it('shows a disabled provider as off and moves BEST on', async () => {
    renderList([fakeAdapter(), createFakeSparkAdapter()], {
      layout: 'table',
      disabledIds: [AAVE],
    });
    await screen.findByRole('button', { name: AAVE_NAME });
    await screen.findByRole('button', { name: SPARK_NAME });

    expect(row(AAVE_NAME)).toBeDisabled();
    expect(row(AAVE_NAME)).toHaveTextContent('LTV TOO HIGH');
    expect(within(row(SPARK_NAME)).getByText('BEST')).toBeInTheDocument();
  });

  it('shows one row skeleton per launch provider while loading', () => {
    const adapter = createFakeAdapter({
      listMarkets: () => new Promise(() => {}),
      getMarketSnapshot: () => new Promise(() => {}),
    });

    renderList(adapter, { layout: 'table' });

    expect(screen.getByText('Borrow APR')).toBeInTheDocument();

    const rows = screen.getAllByTestId('market-row-skeleton');

    expect(rows).toHaveLength(1);

    rows.forEach((skeleton) => {
      expect(within(skeleton).getByText('Loading markets')).toBeInTheDocument();
      expect(
        skeleton.querySelectorAll(':scope > span[aria-hidden]'),
      ).toHaveLength(5);
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the provider’s row skeleton while one of its chains is still pending', async () => {
    renderList(
      fakeAdapter((of) =>
        of.id === BASE.id ? readFakeSnapshot(of) : new Promise(() => {}),
      ),
      { layout: 'table' },
    );

    const label = await screen.findByText('Loading Aave');

    expect(screen.getByTestId('market-row-skeleton')).toContainElement(label);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the row from the chain that loaded, and no Banner, when one chain fails', async () => {
    renderList(failingAdapter({ [ARB.id]: 2 }), { layout: 'table' });

    const aave = await screen.findByRole('button', {
      name: /^Aave on Base/,
    });

    await settled();

    expect(within(aave).getByText('4.85%')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows one Banner when every chain fails, and "Try again" reads them again', async () => {
    const user = userEvent.setup();

    renderList(failingAdapter({ [BASE.id]: 2, [ARB.id]: 2 }), {
      layout: 'table',
    });

    const banner = await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(banner).toHaveTextContent('Aave did not load');
    expect(banner).not.toHaveTextContent(/\d/);

    await user.click(within(banner).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('button', { name: AAVE_NAME }),
    ).toHaveTextContent('4.41%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
