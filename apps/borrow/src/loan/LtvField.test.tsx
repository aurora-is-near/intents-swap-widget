import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { LtvField } from './LtvField';

function Harness({
  initial,
  liquidationLtvBps,
}: {
  initial: number;
  liquidationLtvBps: number | undefined;
}) {
  const [ltv, setLtv] = useState(initial);

  return (
    <LtvField
      liquidationLtvBps={liquidationLtvBps}
      ltv={ltv}
      onLtvChange={setLtv}
    />
  );
}

const slider = () =>
  screen.getByRole('slider', { name: 'Loan to value, percent' });

const marker = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="marker"]');

describe('LtvField', () => {
  it('runs 0–90 in steps of 1, with four zones', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness initial={50} liquidationLtvBps={8100} />,
    );

    expect(slider()).toHaveAttribute('aria-valuenow', '50');

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(slider()).toHaveAttribute('aria-valuenow', '51');

    await user.keyboard('{Home}');

    expect(slider()).toHaveAttribute('aria-valuenow', '0');

    await user.keyboard('{End}');

    expect(slider()).toHaveAttribute('aria-valuenow', '90');

    const zones = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="zone"]'),
    ];

    expect(zones.map(({ style }) => style.background)).toEqual([
      'rgb(203, 234, 140)',
      'rgb(243, 224, 138)',
      'rgb(245, 182, 107)',
      'rgb(229, 105, 79)',
    ]);
  });

  it('shows the percentage and the zone, and follows the slider', async () => {
    const user = userEvent.setup();

    render(<Harness initial={49} liquidationLtvBps={8100} />);

    expect(
      screen.getByText('Loan to value · Conservative'),
    ).toBeInTheDocument();
    expect(screen.getByText('49%')).toBeInTheDocument();

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(slider()).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Loan to value · Moderate')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    await user.keyboard('{End}');

    expect(
      screen.getByText('Loan to value · Near liquidation'),
    ).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('places the liquidation marker at the market’s liquidation LTV', () => {
    const { container } = render(
      <Harness initial={50} liquidationLtvBps={8100} />,
    );

    expect(screen.getByText('liq. 81%')).toBeInTheDocument();
    expect(marker(container)).toHaveStyle({ left: '90%' });
    expect(slider()).toHaveAccessibleDescription(
      'Loan to value · Moderate liq. 81%',
    );
  });

  it('labels a fractional liquidation LTV', () => {
    const { container } = render(
      <Harness initial={50} liquidationLtvBps={8250} />,
    );

    expect(screen.getByText('liq. 82.5%')).toBeInTheDocument();
    expect(marker(container)?.style.left).toMatch(/^91\.66/);
  });

  it('clamps a liquidation LTV past 90% to the track’s end', () => {
    const { container } = render(
      <Harness initial={50} liquidationLtvBps={9500} />,
    );

    expect(screen.getByText('liq. 95%')).toBeInTheDocument();
    expect(marker(container)).toHaveStyle({ left: '100%' });
  });

  it('shows no marker while no market is known', () => {
    const { container } = render(
      <Harness initial={50} liquidationLtvBps={undefined} />,
    );

    expect(marker(container)).toBeNull();
    expect(screen.queryByText(/^liq\./)).not.toBeInTheDocument();
  });
});
