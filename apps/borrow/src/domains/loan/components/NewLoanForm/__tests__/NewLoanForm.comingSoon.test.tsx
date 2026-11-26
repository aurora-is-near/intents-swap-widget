import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '@/domains/markets/providers/MarketAdaptersProvider';
import { emptyBalances } from '@/tests/balancesMock';
import {
  createFakeAdapter,
  createTestQueryClient,
  FAKE_ARB,
  FAKE_BASE,
  FAKE_SNAPSHOTS,
  pairSnapshot,
  USD,
  usdc,
  weth,
} from '@/tests/fakeMarkets';
import type { BalancesMockState } from '@/tests/balancesMock';
import type { MarketSnapshot } from '@/domains/markets/types';

import { NewLoanForm } from '../NewLoanForm';

/**
 * Reserves the borrow action does not cover (`coming-soon`) in the
 * collateral and borrow pickers: listed, disabled and labelled, while those
 * it covers stay selectable and a reached cap still hides a reserve.
 */

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

const balances = vi.hoisted(() => ({}) as BalancesMockState);

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('@/tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('@/tests/balancesMock')).createBalancesMock(
    importOriginal,
    balances,
  ),
);

const COMING_SOON = {
  unavailable: true,
  unavailableReason: 'coming-soon',
} as const;

const CAP_REACHED = {
  unavailable: true,
  unavailableReason: 'cap-reached',
} as const;

/**
 * Base lists wstETH and GHO, which the action does not cover, cbBTC with its
 * supply cap reached, and USDT, which it covers on Arbitrum only.
 */
const SNAPSHOTS: Readonly<Record<string, MarketSnapshot>> = {
  [FAKE_BASE.id]: pairSnapshot(FAKE_BASE, {
    collateral: [
      weth(),
      weth({
        asset: '0x0000000000000000000000000000000000000010',
        symbol: 'wstETH',
        assetId: 'nep141:wsteth',
        priceBase: 4_000n * USD,
        ...COMING_SOON,
      }),
      weth({
        asset: '0x0000000000000000000000000000000000000011',
        symbol: 'cbBTC',
        decimals: 8,
        assetId: 'nep141:cbbtc',
        priceBase: 90_000n * USD,
        ...CAP_REACHED,
      }),
    ],
    borrowable: [
      usdc(),
      usdc({
        asset: '0x0000000000000000000000000000000000000012',
        symbol: 'GHO',
        assetId: 'nep141:gho',
        ...COMING_SOON,
      }),
      usdc({
        asset: '0x0000000000000000000000000000000000000013',
        symbol: 'USDT',
        assetId: 'nep141:usdt-base',
        ...COMING_SOON,
      }),
    ],
  }),
  [FAKE_ARB.id]: pairSnapshot(FAKE_ARB, {
    collateral: FAKE_SNAPSHOTS[FAKE_ARB.id]?.collateral,
    borrowable: [
      ...(FAKE_SNAPSHOTS[FAKE_ARB.id]?.borrowable ?? []),
      usdc({
        asset: '0x0000000000000000000000000000000000000014',
        symbol: 'USDT',
        assetId: 'nep141:usdt-arb',
        variableBorrowApr: 0.05,
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

  // Aave on Arbitrum, its chosen chain (4.41%), once the markets load.
  await screen.findByRole('button', { name: /\bAave 4\.41%/, pressed: true });
};

const supplyPicker = () => screen.getByRole('button', { name: /^SUPPLY / });
const borrowPicker = () => screen.getByRole('button', { name: /^BORROW / });

const openPicker = async (
  user: ReturnType<typeof userEvent.setup>,
  picker: () => HTMLElement,
  name: string,
) => {
  await user.click(picker());

  return within(screen.getByRole('dialog', { name }));
};

beforeEach(() => {
  Object.assign(balances, emptyBalances());
  wallet.isConnected = false;
  wallet.address = undefined;
});

describe('NewLoanForm reserves the borrow action does not cover', () => {
  it('starts on the default pair, WETH / USDC, which is covered', async () => {
    await renderForm();

    expect(supplyPicker()).toHaveAccessibleName('SUPPLY WETH Arbitrum');
    expect(borrowPicker()).toHaveAccessibleName('BORROW USDC Arbitrum');
  });

  it('lists uncovered collateral disabled as "Coming soon", after the covered', async () => {
    const user = userEvent.setup();

    await renderForm();

    const list = await openPicker(
      user,
      supplyPicker,
      'Choose collateral token',
    );

    // The token rows: each names its price; the filter chips do not.
    const rows = list.getAllByRole('button', { name: /\$/ });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAccessibleName('WETH Base · Arbitrum $3,000');
    expect(rows[0]).toBeEnabled();
    expect(rows[1]).toHaveAccessibleName('wstETH Base · Coming soon $4,000');
    expect(rows[1]).toBeDisabled();
  });

  it('still leaves out a reserve whose cap is reached', async () => {
    const user = userEvent.setup();

    await renderForm();

    const list = await openPicker(
      user,
      supplyPicker,
      'Choose collateral token',
    );

    expect(
      list.queryByRole('button', { name: /^cbBTC/ }),
    ).not.toBeInTheDocument();
  });

  it('lists an uncovered borrow token disabled, and keeps covered ones selectable', async () => {
    const user = userEvent.setup();

    await renderForm();

    const list = await openPicker(user, borrowPicker, 'Choose token to borrow');
    const gho = list.getByRole('button', {
      name: 'GHO Base · Coming soon $1.00',
    });

    expect(gho).toBeDisabled();
    // Covered on Arbitrum, not on Base: selectable, on Arbitrum only.
    expect(
      list.getByRole('button', { name: 'USDT Arbitrum $1.00' }),
    ).toBeEnabled();
    expect(
      list.getByRole('button', { name: 'USDC Base · Arbitrum $1.00' }),
    ).toBeEnabled();

    await user.click(gho);

    expect(borrowPicker()).toHaveAccessibleName('BORROW USDC Arbitrum');

    await user.click(list.getByRole('button', { name: 'USDT Arbitrum $1.00' }));

    expect(borrowPicker()).toHaveAccessibleName('BORROW USDT Arbitrum');
  });
});
