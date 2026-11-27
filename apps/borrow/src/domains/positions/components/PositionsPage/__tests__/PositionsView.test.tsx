import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import {
  ARB_MARKET,
  EVM_WALLET,
  fakeAsset,
  fakeLoan,
  fakeRepaidLoan,
} from '@/tests/fakePositions';

import { PositionsView } from '../PositionsView';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
}));

vi.mock('@/domains/wallet/hooks/useWallet', async () =>
  (await import('@/tests/walletMock')).createWalletMock(wallet),
);

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@/domains/wallet/hooks/useConnectWallet', () => ({
  useConnectWallet: () => vi.fn(),
}));

const atRisk = fakeLoan({
  ...ARB_MARKET,
  marketName: 'Aave V3 Arbitrum',
  health: 1.08,
  ltv: 0.75,
  status: 'at-risk',
  liquidationPrice: { symbol: 'WETH', usd: 2400 },
});

const view = (props: Partial<ComponentProps<typeof PositionsView>> = {}) =>
  render(
    <PositionsView
      partial={false}
      positions={[]}
      refetch={vi.fn()}
      status="success"
      onSelect={vi.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  Object.assign(wallet, { address: EVM_WALLET, isConnected: true });
});

describe('PositionsView', () => {
  it('asks to connect without a wallet', () => {
    Object.assign(wallet, { address: undefined, isConnected: false });
    view({ status: 'idle' });

    expect(
      screen.getByRole('heading', { name: 'Connect your wallet' }),
    ).toBeInTheDocument();
  });

  it('shows placeholders on the first read', () => {
    view({ status: 'pending' });

    expect(
      screen.getByRole('status', { name: 'Loading your positions' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with no loans', () => {
    view();

    expect(
      screen.getByRole('heading', { name: 'No positions right now' }),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry when nothing could be read', async () => {
    const refetch = vi.fn();

    view({ status: 'error', refetch });

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Couldn’t load your positions');

    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows the error, not the empty state, when some reads failed and none loaded', () => {
    view({ partial: true });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Couldn’t load your positions',
    );
  });

  it('keeps the loans read under a warning when some reads failed', () => {
    view({ positions: [fakeLoan()], partial: true });

    expect(
      screen.getByText('Some positions may be missing or out of date'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /WETH → USDC/ })).toBeVisible();
  });

  it("shows one loan's figures, with no summary", () => {
    view({ positions: [fakeLoan()] });

    const card = screen.getByRole('region', {
      name: 'WETH → USDC, Aave V3 Base on Base',
    });

    const figure = (label: string) =>
      within(card).getByText(label).nextElementSibling;

    expect(within(card).getByText('Aave V3 Base · 4.85% APR')).toBeVisible();
    expect(figure('Collateral')).toHaveTextContent('1 WETH≈ $3,000.00 · Base');
    expect(figure('Debt')).toHaveTextContent('1,200 USDC');
    expect(figure('Health')).toHaveTextContent('2.08');
    expect(figure('Liquidation LTV')).toHaveTextContent('83%');
    expect(figure('Liq. price')).toHaveTextContent('$1,446');
    expect(figure('Borrow APR')).toHaveTextContent('4.85%');
    expect(figure('Interest / year')).toHaveTextContent('$58.20');
    expect(within(card).queryByText('Borrow fee paid')).not.toBeInTheDocument();
    expect(within(card).getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '40.0%, liquidated at 83%',
    );
    expect(screen.queryByText(/POSITION/)).not.toBeInTheDocument();
  });

  it('shows "—" for figures the source did not give', () => {
    view({
      positions: [
        fakeLoan({
          ltv: null,
          health: null,
          liquidationLtv: null,
          liquidationPrice: null,
          borrowApr: null,
          interestPerYearUsd: null,
        }),
      ],
    });

    [
      'Health',
      'Liquidation LTV',
      'Liq. price',
      'Borrow APR',
      'Interest / year',
    ].forEach((label) =>
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent('—'),
    );
  });

  it('counts the other reserves of a multi-reserve loan', () => {
    view({
      positions: [
        fakeLoan({
          collateral: [
            fakeAsset('WBTC', 0.025, 2500),
            fakeAsset('WETH', 0.5, 1500),
          ],
        }),
      ],
    });

    expect(screen.getByText('Collateral').nextElementSibling).toHaveTextContent(
      '0.025 WBTC+1 more',
    );
  });

  it('warns about an at-risk loan, with its actions disabled', () => {
    view({ positions: [atRisk] });

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Close to liquidation');
    expect(alert).toHaveTextContent(
      'Health is 1.08. If WETH falls to $2,400 (7.4% below today), part of your collateral is sold to repay the loan.',
    );
    expect(
      within(alert).getByRole('button', { name: 'Add collateral' }),
    ).toBeDisabled();
    expect(
      within(alert).getByRole('button', { name: 'Repay part' }),
    ).toBeDisabled();
  });

  it('shows a read-only loan by its provider, without actions', () => {
    view({
      positions: [{ ...atRisk, manageable: false, providerName: 'Morpho' }],
    });

    expect(screen.getByText(/^Morpho · /)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a repaid loan', () => {
    view({ positions: [fakeRepaidLoan()] });

    const card = screen.getByRole('region', { name: 'Loan repaid' });

    expect(card).toHaveTextContent('Your collateral is free to withdraw.');
    expect(
      within(card).getByText('Collateral to withdraw').nextElementSibling,
    ).toHaveTextContent('0.25 WETH');
    expect(
      within(card).getByRole('button', { name: 'Withdraw 0.25 WETH' }),
    ).toBeDisabled();
  });

  describe('with several loans', () => {
    const loans = [fakeLoan(), atRisk, fakeRepaidLoan({ id: 'repaid' })];

    it('sums them and shows the at-risk one first', () => {
      view({ positions: loans });

      const summary = screen.getByRole('region', { name: '3 POSITIONS' });

      expect(summary).toHaveTextContent(
        'Total debt $2,400 · collateral $6,750',
      );
      expect(
        within(summary)
          .getAllByRole('button')
          .map((card) => card.getAttribute('aria-pressed')),
      ).toEqual(['false', 'true', 'false']);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows the loan the search param names, and picks another', async () => {
      const onSelect = vi.fn();

      view({ positions: loans, selectedId: 'repaid', onSelect });

      expect(screen.getByRole('region', { name: 'Loan repaid' })).toBeVisible();

      await userEvent.click(
        screen.getAllByRole('button', { pressed: false })[0] as HTMLElement,
      );

      expect(onSelect).toHaveBeenCalledWith(loans[0]?.id);
    });
  });
});
