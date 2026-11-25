import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ACTIVE_POSITION,
  AT_RISK_POSITION,
  REPAID_POSITION,
} from './positionFixtures';
import { PositionsSummary } from './PositionsSummary';

const POSITIONS = [ACTIVE_POSITION, AT_RISK_POSITION, REPAID_POSITION];

describe('PositionsSummary', () => {
  it('shows the count and the total debt and collateral', () => {
    render(<PositionsSummary positions={POSITIONS} onSelect={vi.fn()} />);

    const summary = screen.getByRole('region', { name: '3 POSITIONS' });

    // Debt 1,500 + 3,700 + 0; collateral 3,000 + 4,800 + 2,400.
    expect(summary).toHaveTextContent('Total debt $5,200 · collateral $10,200');
    expect(within(summary).getAllByRole('listitem')).toHaveLength(3);
  });

  it('says POSITION for one', () => {
    render(
      <PositionsSummary positions={[ACTIVE_POSITION]} onSelect={vi.fn()} />,
    );

    expect(
      screen.getByRole('region', { name: '1 POSITION' }),
    ).toBeInTheDocument();
  });

  it('draws each position as a card: pair, status, market and chain, debt and health', () => {
    render(<PositionsSummary positions={POSITIONS} onSelect={vi.fn()} />);

    const [active, atRisk, repaid] = screen.getAllByRole('button');

    expect(active).toHaveTextContent(
      'WETH → USDCActiveAave V3 · BaseDebt $1,500Health 1.66',
    );
    expect(atRisk).toHaveTextContent(
      'cbBTC → USDTAt riskAave V3 · ArbitrumDebt $3,700Health 1.08',
    );
    expect(within(atRisk!).getByText('1.08')).toHaveClass('text-neg');
    expect(repaid).toHaveTextContent(
      'WETHRepaidAave V3 · ArbitrumDebt $0Health —',
    );
  });

  it('presses the selected card only', () => {
    const { rerender } = render(
      <PositionsSummary
        positions={POSITIONS}
        selectedId={AT_RISK_POSITION.id}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-pressed')),
    ).toEqual(['false', 'true', 'false']);

    rerender(
      <PositionsSummary
        positions={POSITIONS}
        selectedId={REPAID_POSITION.id}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-pressed')),
    ).toEqual(['false', 'false', 'true']);
  });

  it('presses none without a selection', () => {
    render(<PositionsSummary positions={POSITIONS} onSelect={vi.fn()} />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('picks a position by click or keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<PositionsSummary positions={POSITIONS} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /At risk/ }));

    expect(onSelect).toHaveBeenLastCalledWith(AT_RISK_POSITION.id);

    screen.getByRole('button', { name: /Repaid/ }).focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenLastCalledWith(REPAID_POSITION.id);
  });
});
