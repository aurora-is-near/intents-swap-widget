import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import type { MarketSnapshot } from '../markets/types';
import { type BalancesMockState, emptyBalances } from '../tests/balancesMock';
import {
  createFakeAdapter,
  createTestQueryClient,
  FAKE_BASE,
  FAKE_SNAPSHOTS,
  pairSnapshot,
  usdc,
  weth,
} from '../tests/fakeMarkets';
import { NewLoanForm } from './NewLoanForm';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

const balances = vi.hoisted(() => ({}) as BalancesMockState);

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('../tests/balancesMock')).createBalancesMock(
    importOriginal,
    balances,
  ),
);

/** Wallet tokens, priced by 1Click. */
const ETH = {
  assetId: 'nep141:base.omft.near',
  symbol: 'ETH',
  blockchain: 'base',
  decimals: 18,
  price: 3000,
};

const WBTC = {
  assetId: 'nep141:eth-wbtc.omft.near',
  symbol: 'WBTC',
  blockchain: 'eth',
  decimals: 8,
  price: 90_000,
};

const USDT = {
  assetId: 'nep141:arb-usdt.omft.near',
  symbol: 'USDT',
  blockchain: 'arb',
  decimals: 6,
  price: 1,
};

const MEME = {
  assetId: 'nep141:base-meme.omft.near',
  symbol: 'MEME',
  blockchain: 'base',
  decimals: 18,
  price: 0.5,
};

/** 1.5 ETH ($4,500), 0.04 WBTC ($3,600), 2,500 USDT, 1 MEME (unsupported). */
const holdBalances = () => {
  const empty = emptyBalances();

  balances.wallet = {
    ...empty.wallet,
    status: 'success',
    tokens: [ETH, WBTC, USDT, MEME],
    balances: {
      [ETH.assetId]: '1500000000000000000',
      [WBTC.assetId]: '4000000',
      [USDT.assetId]: '2500000000',
      [MEME.assetId]: '1000000000000000000',
    },
  };
  balances.supported = {
    ...empty.supported,
    status: 'success',
    origins: [ETH, WBTC, USDT].map(({ assetId }) => ({ assetId })),
  };
};

const setConnected = (connected: boolean) => {
  wallet.isConnected = connected;
  wallet.address = connected
    ? '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21'
    : undefined;
};

/** The fake markets, with USDT also borrowable on Base. */
const SNAPSHOTS: Readonly<Record<string, MarketSnapshot>> = {
  ...FAKE_SNAPSHOTS,
  [FAKE_BASE.id]: pairSnapshot(FAKE_BASE, {
    collateral: [weth()],
    borrowable: [
      usdc(),
      usdc({
        asset: '0x0000000000000000000000000000000000000003',
        symbol: 'USDT',
        assetId: 'nep141:usdt',
        variableBorrowApr: 0.051,
      }),
    ],
  }),
};

const renderForm = async () => {
  const adapter = createFakeAdapter({
    getMarketSnapshot: async (market) => {
      const found = SNAPSHOTS[market.id];

      if (!found) {
        throw new Error(`no snapshot for ${market.id}`);
      }

      return found;
    },
  });

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MarketAdaptersProvider adapters={[adapter]}>
        <NewLoanForm />
      </MarketAdaptersProvider>
    </QueryClientProvider>,
  );

  // Both markets loaded: the BEST card is selected.
  await screen.findByRole('button', { name: /Aave Arbitrum/, pressed: true });
};

const supplyPicker = () => screen.getByRole('button', { name: /^SUPPLY / });
const borrowPicker = () => screen.getByRole('button', { name: /^BORROW / });

const openSupply = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(supplyPicker());

  return within(
    screen.getByRole('dialog', { name: 'Choose collateral token' }),
  );
};

const amountField = () =>
  screen.getByRole('textbox', { name: 'Collateral amount' });

const received = () =>
  screen.getByRole('status', { name: 'You receive · after fee' });

const feeRow = () => screen.getByText(/^Borrow fee/).parentElement;

beforeEach(() => {
  Object.assign(balances, emptyBalances());
  setConnected(false);
});

describe('NewLoanForm', () => {
  describe('not connected', () => {
    it('shows the default pair, WETH / USDC, and no balances', async () => {
      const user = userEvent.setup();

      await renderForm();

      expect(supplyPicker()).toHaveAccessibleName('SUPPLY WETH Arbitrum');
      expect(borrowPicker()).toHaveAccessibleName('BORROW USDC Arbitrum');

      const list = await openSupply(user);
      const wethRow = list.getByRole('button', { name: /^WETH/ });

      // The reserve's price, not a balance.
      expect(wethRow).toHaveAccessibleName('WETH Base · Arbitrum $3,000');
      expect(screen.queryByText(/^Supplied as/)).not.toBeInTheDocument();
    });

    it('works out the loan from an amount, with oracle prices', async () => {
      const user = userEvent.setup();

      await renderForm();

      expect(screen.getByText('≈ $0.00')).toBeInTheDocument();
      expect(received()).toHaveTextContent('0');
      expect(feeRow()).toHaveTextContent('Borrow fee · 0.30%−0.00 USDC');

      await user.type(amountField(), '2');

      // 2 WETH at $3,000, LTV 50%: 3,000 USDC, less 9 USDC (0.30%).
      expect(screen.getByText('≈ $6,000')).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,991');
      expect(feeRow()).toHaveTextContent('Borrow fee · 0.30%−9.00 USDC');
    });
  });

  describe('connected', () => {
    beforeEach(() => {
      setConnected(true);
      holdBalances();
    });

    it('lists the wallet balances with their USD value, the unsupported one disabled', async () => {
      const user = userEvent.setup();

      await renderForm();

      // The most valuable balance that can fund a loan.
      expect(supplyPicker()).toHaveAccessibleName('SUPPLY ETH Base');

      const list = await openSupply(user);

      expect(
        list.getByRole('button', { name: 'ETH Base 1.5 ETH $4,500.00' }),
      ).toBeEnabled();
      expect(
        list.getByRole('button', { name: 'WBTC Ethereum 0.04 WBTC $3,600.00' }),
      ).toBeEnabled();
      expect(
        list.getByRole('button', {
          name: 'USDT Arbitrum 2,500 USDT $2,500.00',
        }),
      ).toBeEnabled();
      expect(
        list.getByRole('button', { name: /^MEME Base · Not supported yet/ }),
      ).toBeDisabled();
    });

    it('narrows the rows with the group and chain chips', async () => {
      const user = userEvent.setup();

      await renderForm();

      const list = await openSupply(user);
      const groups = within(list.getByRole('group', { name: 'Token group' }));
      const chains = within(list.getByRole('group', { name: 'Chain' }));
      const row = (symbol: string) =>
        list.queryByRole('button', { name: new RegExp(`^${symbol} `) });

      expect(
        groups.getAllByRole('button').map((chip) => chip.textContent),
      ).toEqual(['All', 'ETH', 'BTC', 'Stables']);
      expect(
        chains.getAllByRole('button').map((chip) => chip.textContent),
      ).toEqual(['All chains', 'Base', 'Ethereum', 'Arbitrum']);

      await user.click(groups.getByRole('button', { name: 'BTC' }));

      expect(groups.getByRole('button', { name: 'BTC' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(row('WBTC')).toBeInTheDocument();
      expect(row('ETH')).not.toBeInTheDocument();
      expect(row('USDT')).not.toBeInTheDocument();

      await user.click(groups.getByRole('button', { name: 'All' }));
      await user.click(chains.getByRole('button', { name: 'Base' }));

      expect(row('ETH')).toBeInTheDocument();
      expect(row('MEME')).toBeInTheDocument();
      expect(row('WBTC')).not.toBeInTheDocument();
      expect(row('USDT')).not.toBeInTheDocument();
    });

    it('picks a supply asset and a borrow asset', async () => {
      const user = userEvent.setup();

      await renderForm();

      const list = await openSupply(user);

      await user.click(list.getByRole('button', { name: /^WBTC / }));

      expect(supplyPicker()).toHaveAccessibleName('SUPPLY WBTC Ethereum');

      await user.click(borrowPicker());

      const borrowList = within(
        screen.getByRole('dialog', { name: 'Choose token to borrow' }),
      );

      expect(
        borrowList.getByRole('button', { name: 'USDC Base · Arbitrum $1.00' }),
      ).toBeInTheDocument();

      await user.click(
        borrowList.getByRole('button', { name: 'USDT Base $1.00' }),
      );

      // Only Base lends USDT, so the loan moves there.
      expect(borrowPicker()).toHaveAccessibleName('BORROW USDT Base');
      expect(feeRow()).toHaveTextContent('USDT');
      expect(screen.getByRole('button', { name: /Aave Base/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        screen.queryByRole('button', { name: /Aave Arbitrum/ }),
      ).not.toBeInTheDocument();
    });

    it('updates the USD value, the amount received and the fee as the amount is typed', async () => {
      const user = userEvent.setup();

      await renderForm();

      await user.type(amountField(), '1');

      // 1 ETH at 1Click's $3,000; 1 WETH at the oracle's $3,000, LTV 50%:
      // 1,500 USDC, less 4.50 USDC.
      expect(screen.getByText('≈ $3,000')).toBeInTheDocument();
      expect(received()).toHaveTextContent('1,496');
      expect(feeRow()).toHaveTextContent('−4.50 USDC');

      await user.type(amountField(), '.5');

      expect(screen.getByText('≈ $4,500')).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,243');
      expect(feeRow()).toHaveTextContent('−6.75 USDC');
    });

    it('notes "Supplied as WETH" for an asset no market takes as collateral', async () => {
      const user = userEvent.setup();

      await renderForm();

      // ETH is supplied as WETH itself: no note.
      expect(screen.queryByText(/^Supplied as/)).not.toBeInTheDocument();

      const list = await openSupply(user);

      await user.click(list.getByRole('button', { name: /^USDT / }));

      expect(screen.getByText('Supplied as WETH')).toBeInTheDocument();

      await user.type(amountField(), '1000');

      // $1,000 of USDT as WETH at LTV 50%: about 500 USDC, fee 1.50.
      expect(screen.getByText('≈ $1,000')).toBeInTheDocument();
      expect(feeRow()).toHaveTextContent('−1.50 USDC');
    });

    it('shows a skeleton in the picker’s place while the balances load', async () => {
      balances.wallet = {
        ...emptyBalances().wallet,
        status: 'loading',
      };

      await renderForm();

      expect(screen.getByText('Loading balances')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^SUPPLY / }),
      ).not.toBeInTheDocument();
    });

    it('names the chains it could not read, and retries', async () => {
      const user = userEvent.setup();

      balances.wallet = {
        ...balances.wallet,
        errors: { sol: new Error('rpc refused') },
      };

      await renderForm();

      // A warning Banner is a status region.
      const [banner] = screen
        .getAllByRole('status')
        .filter((region) =>
          region.textContent?.includes('Some balances did not load'),
        );

      if (!banner) {
        throw new Error('no balances banner');
      }

      expect(banner).toHaveTextContent('Balances on Solana could not be read.');

      await user.click(
        within(banner).getByRole('button', { name: 'Try again' }),
      );

      expect(balances.wallet.refresh).toHaveBeenCalledOnce();
    });

    it('says the balances did not load when the whole read fails, and retries', async () => {
      const user = userEvent.setup();

      // No data at all: no rows and no per-chain errors.
      balances.wallet = {
        ...emptyBalances().wallet,
        status: 'error',
        error: new Error('tokens request failed'),
      };

      await renderForm();

      const [banner] = screen
        .getAllByRole('status')
        .filter((region) =>
          region.textContent?.includes('Balances did not load'),
        );

      if (!banner) {
        throw new Error('no balances banner');
      }

      expect(banner).toHaveTextContent(
        'Your wallet’s balances could not be read.',
      );

      await user.click(
        within(banner).getByRole('button', { name: 'Try again' }),
      );

      expect(balances.wallet.refresh).toHaveBeenCalledOnce();
    });
  });
});
