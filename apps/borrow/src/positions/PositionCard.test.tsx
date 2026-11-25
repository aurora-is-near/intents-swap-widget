import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EVM_WALLET, loanPosition } from '../tests/fakePositions';
import { PositionCard } from './PositionCard';
import type { LoanPosition } from './types';

const renderCard = (position: LoanPosition) =>
  render(<PositionCard position={position} />);

/** A stat or reserve tile's value, found by its label. */
const tile = (label: string) => {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;

  if (!value) {
    throw new Error(`No value for ${label}`);
  }

  return value;
};

/** At risk: health 1.08 on $3,000 of WETH against $2,300 of USDC. */
const AT_RISK = loanPosition({
  debt: [{ symbol: 'USDC', amount: 2300, usd: 2300 }],
  debtUsd: 2300,
  ltv: 0.7667,
  health: 1.08,
  liquidationPrice: { symbol: 'WETH', usd: 2771.08 },
  status: 'at-risk',
});

const REPAID = loanPosition({
  debt: [],
  debtUsd: 0,
  ltv: null,
  health: null,
  liquidationPrice: null,
  interestPerYearUsd: null,
  status: 'repaid',
});

describe('PositionCard', () => {
  it('shows an active loan’s market, APR, reserves, LTV and figures', () => {
    renderCard(loanPosition());

    const card = screen.getByRole('region', {
      name: 'WETH → USDC, Aave V3 on Base',
    });

    expect(within(card).getByText('ACTIVE LOAN')).toBeInTheDocument();
    expect(within(card).getByText('Aave V3 · 4.85% APR')).toBeInTheDocument();

    expect(tile('Collateral')).toHaveTextContent('1 WETH≈ $3,000 · Base');
    expect(tile('Debt')).toHaveTextContent('1,500 USDC≈ $1,500 · Base');

    expect(within(card).getByText('50.0%')).toBeInTheDocument();
    expect(
      within(card).getByRole('meter', { name: 'Loan to value' }),
    ).toHaveAttribute('aria-valuetext', '50%, liquidation at 83%');
    expect(within(card).getByText('liq. 83%')).toBeInTheDocument();

    expect(tile('Health')).toHaveTextContent('1.66');
    expect(tile('Liquidation LTV')).toHaveTextContent('83%');
    expect(tile('Liq. price')).toHaveTextContent('$1,807');
    expect(tile('Borrow APR')).toHaveTextContent('4.85%');
    expect(tile('Interest / year')).toHaveTextContent('$72.75');
  });

  it('has no "Borrow fee paid" tile, no banner and no action buttons while healthy', () => {
    renderCard(loanPosition());

    expect(screen.queryByText('Borrow fee paid')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "—" for every figure the provider did not return', () => {
    renderCard(
      loanPosition({
        ltv: null,
        liquidationLtv: null,
        health: null,
        liquidationPrice: null,
        borrowApr: null,
        interestPerYearUsd: null,
      }),
    );

    expect(screen.getByText('Aave V3')).toBeInTheDocument();
    expect(tile('Health')).toHaveTextContent('—');
    expect(tile('Liquidation LTV')).toHaveTextContent('—');
    expect(tile('Liq. price')).toHaveTextContent('—');
    expect(tile('Borrow APR')).toHaveTextContent('—');
    expect(tile('Interest / year')).toHaveTextContent('—');
    expect(
      screen.getByRole('img', { name: 'Loan to value: Unknown' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^liq\./)).not.toBeInTheDocument();
  });

  it('shows the largest reserve with "+N more" and the dollar totals', () => {
    renderCard(
      loanPosition({
        collateral: [
          { symbol: 'WETH', amount: 1, usd: 3000 },
          { symbol: 'cbBTC', amount: 0.1, usd: 9000 },
          { symbol: 'USDC', amount: 10, usd: 10 },
        ],
        collateralUsd: 12_010,
        debt: [
          { symbol: 'USDC', amount: 1500, usd: 1500 },
          { symbol: 'GHO', amount: 100, usd: null },
        ],
        debtUsd: 1500,
      }),
    );

    expect(tile('Collateral')).toHaveTextContent(
      '0.1 cbBTC+2 more≈ $12,010 · Base',
    );
    expect(tile('Debt')).toHaveTextContent('1,500 USDC+1 more≈ $1,500 · Base');
  });

  it('warns of an at-risk loan with the risk text and disabled actions', () => {
    renderCard(AT_RISK);

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Close to liquidation');
    expect(alert).toHaveTextContent(
      'Health is 1.08. If WETH falls to $2,771 (7.4% below today), part of your collateral is sold to repay the loan. Add collateral or repay some debt to stay safe.',
    );
    expect(
      within(alert).getByRole('button', { name: 'Add collateral' }),
    ).toBeDisabled();
    expect(
      within(alert).getByRole('button', { name: 'Repay part' }),
    ).toBeDisabled();
    expect(tile('Health')).toHaveClass('text-neg');
  });

  it('tells the drop without a price when the liquidation price is unknown', () => {
    renderCard({ ...AT_RISK, liquidationPrice: null });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Health is 1.08. If your collateral falls 7.4% below today, part of your collateral is sold to repay the loan.',
    );
  });

  it('shows a read-only loan with the provider’s name and no actions', () => {
    renderCard({
      ...AT_RISK,
      owner: EVM_WALLET,
      provider: 'morpho',
      providerName: 'Morpho',
      marketName: 'WETH / USDC',
      manageable: false,
    });

    expect(screen.getByText('Morpho · 4.85% APR')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Close to liquidation');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a repaid loan with its collateral and a disabled withdraw', () => {
    renderCard(REPAID);

    const card = screen.getByRole('region', { name: 'Loan repaid' });

    expect(card).toHaveTextContent('Your collateral is free to withdraw.');
    expect(tile('Collateral to withdraw')).toHaveTextContent(
      '1 WETH≈ $3,000 · Base',
    );
    expect(
      within(card).getByRole('button', { name: 'Withdraw 1 WETH' }),
    ).toBeDisabled();
    expect(screen.queryByText('ACTIVE LOAN')).not.toBeInTheDocument();
  });

  it('shows a read-only repaid loan without the withdraw button', () => {
    renderCard({
      ...REPAID,
      providerName: 'Spark',
      manageable: false,
    });

    expect(
      screen.getByRole('region', { name: 'Loan repaid' }),
    ).toHaveTextContent('Your collateral is free to withdraw on Spark.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
