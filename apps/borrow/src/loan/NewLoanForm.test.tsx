import '../tests/pointerEvent';

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import type { LendingMarketAdapter, MarketSnapshot } from '../markets/types';
import { type BalancesMockState, emptyBalances } from '../tests/balancesMock';
import {
  createFakeAdapter,
  createFakeSparkAdapter,
  createTestQueryClient,
  FAKE_ARB,
  FAKE_BASE,
  FAKE_SNAPSHOTS,
  pairSnapshot,
  USD,
  usdc,
  weth,
} from '../tests/fakeMarkets';
import { NewLoanForm } from './NewLoanForm';
import type { BorrowRequest } from './useLoanForm';

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

/**
 * Renders the form over `snapshots`, and any `more` providers, and waits for
 * the market list to select `selected` (Aave on Arbitrum, its chosen chain,
 * by default). The cards name no chain: a card is told by its APR.
 */
const renderForm = async ({
  snapshots = SNAPSHOTS,
  more = [],
  selected = /\bAave 4\.41%/,
  onBorrow,
}: {
  snapshots?: Readonly<Record<string, MarketSnapshot>>;
  more?: LendingMarketAdapter[];
  selected?: RegExp;
  onBorrow?: (request: BorrowRequest) => void;
} = {}) => {
  const adapter = createFakeAdapter({
    getMarketSnapshot: async (market) => {
      const found = snapshots[market.id];

      if (!found) {
        throw new Error(`no snapshot for ${market.id}`);
      }

      return found;
    },
  });

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MarketAdaptersProvider adapters={[adapter, ...more]}>
        <NewLoanForm onBorrow={onBorrow} />
      </MarketAdaptersProvider>
    </QueryClientProvider>,
  );

  // The markets loaded: the selected card is pressed.
  await screen.findByRole('button', { name: selected, pressed: true });
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
      expect(feeRow()).toHaveTextContent('Borrow fee · 0.30%−0.00 WETH');

      await user.type(amountField(), '2');

      // 2 WETH at $3,000: the fee, 0.30%, is taken from the collateral, as
      // the dry run reports it, so 1.994 WETH at LTV 50% is 2,991 USDC,
      // received whole.
      expect(screen.getByText('≈ $6,000')).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,991');
      expect(feeRow()).toHaveTextContent('Borrow fee · 0.30%−0.006 WETH');
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

      // Only Base lends USDT, so Aave's loan moves there.
      expect(borrowPicker()).toHaveAccessibleName('BORROW USDT Base');
      // The fee is taken from the collateral, not the borrowed USDT.
      expect(feeRow()).toHaveTextContent('WETH');
      expect(
        screen.getByRole('button', { name: /\bAave 5\.10%/ }),
      ).toHaveAttribute('aria-pressed', 'true');
      expect(
        screen.queryByRole('button', { name: /\bAave 4\.41%/ }),
      ).not.toBeInTheDocument();
    });

    it('updates the USD value, the amount received and the fee as the amount is typed', async () => {
      const user = userEvent.setup();

      await renderForm();

      await user.type(amountField(), '1');

      // 1 ETH at 1Click's $3,000; 1 WETH at the oracle's $3,000 less the
      // 0.30% fee, 0.997 WETH, at LTV 50%: 1,495.50 USDC.
      expect(screen.getByText('≈ $3,000')).toBeInTheDocument();
      expect(received()).toHaveTextContent('1,496');
      expect(feeRow()).toHaveTextContent('−0.003 WETH');

      await user.type(amountField(), '.5');

      expect(screen.getByText('≈ $4,500')).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,243');
      expect(feeRow()).toHaveTextContent('−0.0045 WETH');
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

      // $1,000 of USDT as WETH: about 0.333 WETH, fee 0.001 WETH.
      expect(screen.getByText('≈ $1,000')).toBeInTheDocument();
      expect(feeRow()).toHaveTextContent('−0.001 WETH');
    });

    it('never borrows the collateral: a USDC holding moves the borrow off USDC', async () => {
      const user = userEvent.setup();
      const USDC = {
        assetId: 'nep141:arb-usdc.omft.near',
        symbol: 'USDC',
        blockchain: 'arb',
        decimals: 6,
        price: 1,
      };

      // USDC is Aave collateral on both chains, as on Base and Arbitrum.
      const usdcCollateral = weth({
        asset: '0x0000000000000000000000000000000000000002',
        symbol: 'USDC',
        decimals: 6,
        assetId: 'nep141:usdc',
        maxLtvBps: 7500,
        liquidationLtvBps: 7800,
        priceBase: USD,
      });

      const base = SNAPSHOTS[FAKE_BASE.id];
      const arb = SNAPSHOTS[FAKE_ARB.id];

      if (!base || !arb) {
        throw new Error('missing fake snapshots');
      }

      // The top holding: 10,000 USDC, worth more than the 1.5 ETH.
      balances.wallet = {
        ...balances.wallet,
        tokens: [...balances.wallet.tokens, USDC],
        balances: {
          ...balances.wallet.balances,
          [USDC.assetId]: '10000000000',
        },
      };
      balances.supported = {
        ...balances.supported,
        origins: [...balances.supported.origins, { assetId: USDC.assetId }],
      };

      await renderForm({
        snapshots: {
          [FAKE_BASE.id]: {
            ...base,
            collateral: [...base.collateral, usdcCollateral],
          },
          [FAKE_ARB.id]: {
            ...arb,
            collateral: [...arb.collateral, usdcCollateral],
          },
        },
        // Only Base lends USDT, at 5.10%.
        selected: /\bAave 5\.10%/,
      });

      expect(supplyPicker()).toHaveAccessibleName('SUPPLY USDC Arbitrum');
      expect(borrowPicker()).toHaveAccessibleName('BORROW USDT Base');
      expect(screen.queryByText(/^Supplied as/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /\bAave 4\.41%/ }),
      ).not.toBeInTheDocument();

      await user.click(borrowPicker());

      const borrowList = within(
        screen.getByRole('dialog', { name: 'Choose token to borrow' }),
      );

      expect(
        borrowList.getByRole('button', { name: /^USDT / }),
      ).toBeInTheDocument();
      expect(
        borrowList.queryByRole('button', { name: /^USDC / }),
      ).not.toBeInTheDocument();
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

  describe('loan to value and recipient', () => {
    const ltvSlider = () =>
      screen.getByRole('slider', { name: 'Loan to value, percent' });

    it('recomputes the borrow amount, the received amount and the fee as the slider moves', async () => {
      const user = userEvent.setup();

      await renderForm();
      await user.type(amountField(), '2');

      expect(screen.getByText('Loan to value · Moderate')).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,991');

      ltvSlider().focus();
      await user.keyboard('{ArrowLeft}');

      // 2 WETH less the 0.30% fee, at $3,000 and LTV 49%: 2,931 USDC; the
      // fee stays 0.006 WETH.
      expect(
        screen.getByText('Loan to value · Conservative'),
      ).toBeInTheDocument();
      // The form card's figure; the LTV summary tile shows it too.
      expect(
        within(screen.getByRole('region', { name: 'Loan details' })).getByText(
          '49%',
        ),
      ).toBeInTheDocument();
      expect(received()).toHaveTextContent('2,931');
      expect(feeRow()).toHaveTextContent('−0.006 WETH');
    });

    it('marks the selected market’s liquidation LTV', async () => {
      await renderForm();

      // Aave lends on Arbitrum, the lower APR: liquidation at 82.5%.
      expect(screen.getByText('liq. 82.5%')).toBeInTheDocument();
    });

    it('still works the loan out at LTV 82, above every market’s max', async () => {
      const user = userEvent.setup();

      await renderForm();
      await user.type(amountField(), '2');

      ltvSlider().focus();

      // 50 → 82.
      await user.keyboard('{ArrowRight}'.repeat(32));

      expect(ltvSlider()).toHaveAttribute('aria-valuenow', '82');
      expect(
        screen.getByText('Loan to value · Near liquidation'),
      ).toBeInTheDocument();
      // The form card's figure; the LTV summary tile shows it too.
      expect(
        within(screen.getByRole('region', { name: 'Loan details' })).getByText(
          '82%',
        ),
      ).toBeInTheDocument();
      // No provider fits: the first one's chosen chain stands in (the
      // artboard's `|| M[0]`), Aave on Arbitrum, liquidation at 82.5%.
      // 1.994 WETH after the fee: 4,905 USDC.
      expect(screen.getByText('liq. 82.5%')).toBeInTheDocument();
      expect(received()).toHaveTextContent('4,905');
      expect(feeRow()).toHaveTextContent('−0.006 WETH');
      // The triggers keep the stand-in's chain.
      expect(supplyPicker()).toHaveAccessibleName('SUPPLY WETH Arbitrum');
      expect(borrowPicker()).toHaveAccessibleName('BORROW USDC Arbitrum');
      // A stand-in for the figures only: no market is selected.
      expect(
        screen.queryByRole('button', { name: /^Aave /, pressed: true }),
      ).not.toBeInTheDocument();
    });

    it('asks for a recipient on check and clears it on uncheck', async () => {
      const user = userEvent.setup();
      const checkbox = () =>
        screen.getByRole('checkbox', {
          name: 'Send borrowed funds to another wallet',
        });

      const address = () =>
        screen.getByRole('textbox', { name: 'Recipient wallet address' });

      await renderForm();

      expect(
        screen.queryByRole('textbox', { name: 'Recipient wallet address' }),
      ).not.toBeInTheDocument();

      await user.click(checkbox());
      await user.type(address(), 'not-an-address');
      await user.tab();

      expect(address()).toHaveAccessibleDescription(
        'Enter a valid EVM address (0x…)',
      );

      await user.clear(address());
      await user.type(address(), '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21');

      expect(address()).not.toHaveAttribute('aria-invalid');

      await user.click(checkbox());

      expect(
        screen.queryByRole('textbox', { name: 'Recipient wallet address' }),
      ).not.toBeInTheDocument();

      await user.click(checkbox());

      expect(address()).toHaveValue('');
    });
  });

  describe('market selection, summary and call to action', () => {
    beforeEach(() => {
      wallet.connect.mockReset().mockResolvedValue(undefined);
    });

    const ltvSlider = () =>
      screen.getByRole('slider', { name: 'Loan to value, percent' });

    const moveLtv = async (
      user: ReturnType<typeof userEvent.setup>,
      keys: string,
    ) => {
      ltvSlider().focus();
      await user.keyboard(keys);
    };

    /** A summary tile's value, by its label. */
    const tile = (label: string) =>
      screen.getByText(label, { selector: 'dt' }).nextElementSibling;

    /** A provider's card: Aave on Arbitrum, or the fake Spark on Base. */
    const market = (name: 'Aave' | 'Spark') =>
      screen.getByRole('button', { name: new RegExp(`\\b${name} \\d`) });

    const cta = (name: string | RegExp) =>
      within(screen.getByRole('region', { name: 'Markets' })).getByRole(
        'button',
        { name },
      );

    it('shows the selected market’s LTV, liquidation price and LTV, and health', async () => {
      const user = userEvent.setup();

      await renderForm({ more: [createFakeSparkAdapter()] });

      // Nothing borrowed yet: no liquidation price.
      expect(tile('LTV')).toHaveTextContent('50%');
      expect(tile('Liquidation')).toHaveTextContent('—at 82.5% LTV');
      expect(tile('Health')).toHaveTextContent('1.65');

      await user.type(amountField(), '2');

      // Aave on Arbitrum (BEST): 2,991 USDC against 1.994 WETH (2 less the
      // fee), liquidated at 82.5%, so when WETH is at $1,818.18; health
      // 82.5 ÷ 50.
      expect(tile('Liquidation')).toHaveTextContent('$1,818at 82.5% LTV');
      expect(tile('Health')).toHaveTextContent('1.65');

      await user.click(market('Spark'));

      // Spark: liquidation at 81%, so at $1,851.85; health 81 ÷ 50.
      expect(market('Spark')).toHaveAttribute('aria-pressed', 'true');
      expect(market('Aave')).toHaveAttribute('aria-pressed', 'false');
      expect(tile('Liquidation')).toHaveTextContent('$1,852at 81% LTV');
      expect(tile('Health')).toHaveTextContent('1.62');
    });

    it('shows "—" for health at LTV 0', async () => {
      const user = userEvent.setup();

      await renderForm();
      await moveLtv(user, '{Home}');

      expect(tile('LTV')).toHaveTextContent('0%');
      expect(tile('Health')).toHaveTextContent('—');
    });

    it('falls back to BEST when the picked provider stops fitting the LTV', async () => {
      const user = userEvent.setup();

      await renderForm({ more: [createFakeSparkAdapter()] });
      await user.click(market('Spark'));

      expect(market('Spark')).toHaveAttribute('aria-pressed', 'true');

      // 50 → 80: above Spark's max of 79%, within Aave on Arbitrum's 80%.
      await moveLtv(user, '{ArrowRight}'.repeat(30));

      expect(market('Spark')).toBeDisabled();
      expect(market('Spark')).toHaveTextContent('MAX 79%');
      expect(market('Aave')).toHaveAttribute('aria-pressed', 'true');
      expect(market('Aave')).toHaveTextContent('BEST');
      expect(screen.getByText('liq. 82.5%')).toBeInTheDocument();
      // 82.5 ÷ 80, rounded down.
      expect(tile('Health')).toHaveTextContent('1.03');

      // Back within Spark's max: the pick holds again.
      await moveLtv(user, '{ArrowLeft}');

      expect(market('Spark')).toHaveAttribute('aria-pressed', 'true');
      expect(tile('Health')).toHaveTextContent('1.02');
    });

    it('selects nothing until every market has loaded, as the list does', async () => {
      const user = userEvent.setup();
      let loadArbitrum: () => void = () => {};
      const arbitrumLoaded = new Promise<void>((resolve) => {
        loadArbitrum = resolve;
      });

      const adapter = createFakeAdapter({
        getMarketSnapshot: async (read) => {
          const found = SNAPSHOTS[read.id];

          if (!found) {
            throw new Error(`no snapshot for ${read.id}`);
          }

          // Arbitrum, the cheaper market, answers last.
          if (read.id === FAKE_ARB.id) {
            await arbitrumLoaded;
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

      // Base alone has loaded: Aave's card waits for Arbitrum, so its
      // chain does not jump.
      await screen.findByText('Loading Aave');
      await user.type(amountField(), '2');

      // No selection, so no figures from Base yet.
      expect(
        screen.queryByRole('button', { name: /Aave on/ }),
      ).not.toBeInTheDocument();
      expect(tile('Health')).toHaveTextContent('—');
      expect(tile('Liquidation')).toHaveTextContent('—');
      expect(received()).toHaveTextContent('0');

      loadArbitrum();

      // Then Aave on Arbitrum, its chosen chain, everywhere at once.
      expect(
        await screen.findByRole('button', {
          name: /\bAave 4\.41%/,
          pressed: true,
        }),
      ).toBeInTheDocument();
      expect(tile('Liquidation')).toHaveTextContent('$1,818at 82.5% LTV');
      expect(received()).toHaveTextContent('2,991');
    });

    describe('not connected', () => {
      it('offers to connect on the selected market, and opens the wallet', async () => {
        const user = userEvent.setup();

        await renderForm();

        const button = cta('Connect wallet to borrow on Aave');

        expect(button).toBeEnabled();
        // The lime market chip.
        expect(within(button).getByText('Aave')).toBeInTheDocument();

        await user.click(button);

        expect(wallet.connect).toHaveBeenCalledOnce();
      });
    });

    describe('connected', () => {
      beforeEach(() => {
        setConnected(true);
        holdBalances();
      });

      it('asks for an amount', async () => {
        await renderForm();

        expect(cta('Enter an amount')).toBeDisabled();
      });

      it('says the balance is too low for an amount above it', async () => {
        const user = userEvent.setup();

        await renderForm();
        // 1.5 ETH held.
        await user.type(amountField(), '2');

        expect(cta('Insufficient balance')).toBeDisabled();
      });

      it('does not say the balance is too low when the balances did not load', async () => {
        const user = userEvent.setup();

        balances.wallet = {
          ...emptyBalances().wallet,
          status: 'error',
          error: new Error('tokens request failed'),
        };

        await renderForm();
        await user.type(amountField(), '2');

        expect(
          screen.queryByRole('button', { name: 'Insufficient balance' }),
        ).not.toBeInTheDocument();
      });

      it('disables every market and the CTA at an LTV above every market’s max', async () => {
        const user = userEvent.setup();

        await renderForm();
        await user.type(amountField(), '1');
        // 50 → 82, as Web-Borrow-HighLtv.
        await moveLtv(user, '{ArrowRight}'.repeat(32));

        expect(market('Aave')).toBeDisabled();
        // Arbitrum's max, the chain Aave lends on.
        expect(market('Aave')).toHaveTextContent('MAX 80%');
        expect(screen.queryByText('BEST')).not.toBeInTheDocument();
        expect(cta('LTV too high')).toBeDisabled();
        // Aave's chosen chain stands in for the figures (`|| M[0]`):
        // 82.5 ÷ 82, rounded down.
        expect(tile('LTV')).toHaveTextContent('82%');
        expect(tile('Health')).toHaveTextContent('1.00');
      });

      it('asks for a recipient while the address is empty or invalid', async () => {
        const user = userEvent.setup();

        await renderForm();
        await user.type(amountField(), '1');
        await user.click(
          screen.getByRole('checkbox', {
            name: 'Send borrowed funds to another wallet',
          }),
        );

        expect(cta('Enter recipient address')).toBeDisabled();

        const address = screen.getByRole('textbox', {
          name: 'Recipient wallet address',
        });

        await user.type(address, '0x1234');

        expect(cta('Enter recipient address')).toBeDisabled();

        await user.clear(address);
        await user.type(address, '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21');

        expect(cta('Borrow 1,496 USDC on Aave')).toBeEnabled();
      });

      it('shows the loan it is ready to make, and hands it to onBorrow', async () => {
        const user = userEvent.setup();
        const onBorrow = vi.fn();

        await renderForm({ onBorrow });
        // 1 ETH less the 0.30% fee at $3,000, LTV 50%, on Arbitrum:
        // 1,495.50 USDC.
        await user.type(amountField(), '1');

        const button = cta('Borrow 1,496 USDC on Aave');

        expect(button).toBeEnabled();
        expect(within(button).getByText('Aave')).toBeInTheDocument();

        await user.click(button);

        expect(wallet.connect).not.toHaveBeenCalled();
        expect(onBorrow).toHaveBeenCalledOnce();
        expect(onBorrow.mock.lastCall?.[0]).toMatchObject({
          market: FAKE_ARB,
          collateral: { symbol: 'WETH' },
          borrow: { symbol: 'USDC' },
          origin: { assetId: ETH.assetId, chain: 'base', decimals: 18 },
          amount: 10n ** 18n,
          ltv: 50,
          estimatedBorrowAmount: 1_495_500_000n,
          recipient: undefined,
          paid: { symbol: 'ETH' },
        });
      });
    });
  });
});
