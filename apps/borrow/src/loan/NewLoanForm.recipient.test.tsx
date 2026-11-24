import '../tests/pointerEvent';

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import { type BalancesMockState, emptyBalances } from '../tests/balancesMock';
import { createFakeAdapter, createTestQueryClient } from '../tests/fakeMarkets';
import { NewLoanForm } from './NewLoanForm';

/**
 * The recipient rule by the connected wallet's family: a Solana wallet
 * can't receive on the market's EVM chain, so it must name a recipient.
 */

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  family: null as 'evm' | 'sol' | null,
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

const connect = (family: 'evm' | 'sol') => {
  wallet.isConnected = true;
  wallet.family = family;
  wallet.address =
    family === 'evm'
      ? '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21'
      : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
};

const renderForm = async () => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MarketAdaptersProvider adapters={[createFakeAdapter()]}>
        <NewLoanForm />
      </MarketAdaptersProvider>
    </QueryClientProvider>,
  );

  // Aave on Arbitrum, its chosen chain (4.41%), is selected once the markets load.
  await screen.findByRole('button', {
    name: /\bAave 4\.41%/,
    pressed: true,
  });
};

const checkbox = () =>
  screen.getByRole('checkbox', {
    name: 'Send borrowed funds to another wallet',
  });

const cta = (name: string) =>
  within(screen.getByRole('region', { name: 'Markets' })).getByRole('button', {
    name,
  });

const REASON = "Required: your wallet can't receive on Arbitrum";

beforeEach(() => {
  Object.assign(balances, emptyBalances());
});

describe('NewLoanForm recipient by wallet family', () => {
  it('with a Solana wallet, locks the recipient on and waits for a valid EVM address', async () => {
    const user = userEvent.setup();

    connect('sol');
    await renderForm();

    expect(checkbox()).toBeChecked();
    expect(checkbox()).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox()).toHaveAccessibleDescription(REASON);

    await user.type(
      screen.getByRole('textbox', { name: 'Collateral amount' }),
      '1',
    );

    expect(cta('Enter recipient address')).toBeDisabled();

    // Not turned off by a click.
    await user.click(checkbox());

    expect(checkbox()).toBeChecked();

    const address = screen.getByRole('textbox', {
      name: 'Recipient wallet address',
    });

    await user.type(address, '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

    expect(cta('Enter recipient address')).toBeDisabled();

    await user.clear(address);
    await user.type(address, '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21');

    // 1 WETH less the 0.30% fee at $3,000, LTV 50%, on Arbitrum.
    expect(cta('Borrow 1,496 USDC on Aave')).toBeInTheDocument();
  });

  it('with an EVM wallet, leaves the recipient optional', async () => {
    const user = userEvent.setup();

    connect('evm');
    await renderForm();

    expect(checkbox()).not.toBeChecked();
    expect(checkbox()).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(/^Required:/)).not.toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: 'Collateral amount' }),
      '1',
    );

    expect(cta('Borrow 1,496 USDC on Aave')).toBeInTheDocument();
  });
});
