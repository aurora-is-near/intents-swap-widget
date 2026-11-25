import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LtvBar } from './LtvBar';

const renderBar = (ltv: number | null, liquidationLtvBps: number | null) =>
  render(
    <>
      <div id="ltv-label">Loan to value</div>
      <LtvBar
        labelledBy="ltv-label"
        liquidationLtvBps={liquidationLtvBps}
        ltv={ltv}
      />
    </>,
  );

/** The knob: the 24px ink-bordered circle. */
const knob = (bar: HTMLElement) =>
  bar.querySelector<HTMLElement>('.border-ink');

/** The liquidation marker: the 3px `neg` line. */
const marker = (bar: HTMLElement) => bar.querySelector<HTMLElement>('.bg-neg');

/** An element's `left`, in percent of the track. */
const leftPercent = (element: HTMLElement | null) =>
  Number.parseFloat(element?.style.left ?? 'NaN');

describe('LtvBar', () => {
  it('places the knob and the marker at value / 90 of the track', () => {
    renderBar(45, 8250);

    const bar = screen.getByRole('meter', { name: 'Loan to value' });

    expect(leftPercent(knob(bar))).toBeCloseTo(50);
    expect(leftPercent(marker(bar))).toBeCloseTo(91.667, 3);
    expect(screen.getByText('liq. 82.5%').style.left).toBe(
      marker(bar)?.style.left,
    );
    expect(bar).toHaveAttribute('aria-valuenow', '45');
    expect(bar).toHaveAttribute('aria-valuetext', '45%, liquidation at 82.5%');
  });

  it('stops the knob and the value at the track’s end past 90%', () => {
    renderBar(120, 9500);

    const bar = screen.getByRole('meter', { name: 'Loan to value' });

    expect(bar).toHaveAttribute('aria-valuenow', '90');
    expect(leftPercent(knob(bar))).toBe(100);
    expect(leftPercent(marker(bar))).toBe(100);
  });

  it('has no knob or marker for unknown figures', () => {
    renderBar(null, null);

    const bar = screen.getByRole('img', { name: 'Loan to value: Unknown' });

    expect(knob(bar)).toBeNull();
    expect(marker(bar)).toBeNull();
    expect(screen.queryByText(/^liq\./)).not.toBeInTheDocument();
  });
});
