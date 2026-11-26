import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoanSummary } from '../LoanSummary';

/** A summary tile's value, by its label. */
const tile = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling;

const renderSummary = (liquidationPriceUsd: number) =>
  render(
    <LoanSummary
      healthHundredths={162n}
      liquidationLtvBps={7800}
      liquidationPriceUsd={liquidationPriceUsd}
      ltv={50}
    />,
  );

describe('LoanSummary', () => {
  it('shows a liquidation price below $10,000 in whole dollars', () => {
    renderSummary(9_999.4);

    expect(tile('Liquidation')).toHaveTextContent('$9,999at 78% LTV');
  });

  it('shows a liquidation price from $10,000 in compact dollars, as for WBTC', () => {
    renderSummary(62_400);

    expect(tile('Liquidation')).toHaveTextContent('$62.4Kat 78% LTV');
  });

  it('compacts exactly $10,000', () => {
    renderSummary(10_000);

    expect(tile('Liquidation')).toHaveTextContent('$10K');
  });
});
