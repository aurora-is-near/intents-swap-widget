// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StepProgress } from './StepProgress';

afterEach(cleanup);

const STEPS = [
  { label: 'Approve USDC', status: 'done' },
  { label: 'Supply collateral', status: 'active' },
  { label: 'Bridge', status: 'failed' },
  { label: 'Borrow', status: 'waiting' },
] as const;

describe('StepProgress', () => {
  it('renders an ordered list with one item per step', () => {
    render(<StepProgress aria-label="Progress" steps={STEPS} />);

    const list = screen.getByRole('list', { name: 'Progress' });

    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  /** What tells each status's icon apart from the others. */
  const expectIcon: Record<string, (icon: Element) => void> = {
    // An ink (`--badge`) circle with a lime check.
    Done: (icon) => {
      expect(icon.tagName.toLowerCase()).toBe('svg');
      expect(icon).toHaveClass('text-badge');
      expect(icon.querySelector('path.stroke-accent')).not.toBeNull();
    },
    // The spinner.
    'In progress': (icon) => {
      expect(
        within(icon as HTMLElement).getByRole('status', { hidden: true }),
      ).toBeInTheDocument();
    },
    // The #A8321F circle with a cross.
    Failed: (icon) => {
      expect(icon.tagName.toLowerCase()).toBe('svg');
      expect(icon).toHaveAttribute('color', '#A8321F');
    },
    // The outlined circle with the step's number.
    Waiting: (icon) => {
      expect(icon.tagName.toLowerCase()).toBe('span');
      expect(icon).toHaveTextContent(/^4$/);
    },
  };

  it.each([
    ['Approve USDC', 'Done'],
    ['Supply collateral', 'In progress'],
    ['Bridge', 'Failed'],
    ['Borrow', 'Waiting'],
  ])('gives "%s" its icon and the hidden status "%s"', (label, status) => {
    render(<StepProgress steps={STEPS} />);

    const item = screen.getByText(label).closest('li');

    expect(item).not.toBeNull();
    expect(item).toHaveTextContent(`${status}: ${label}`);
    expect(within(item as HTMLElement).getByText(`${status}:`)).toHaveClass(
      'sr-only',
    );

    const icon = (item as HTMLElement).firstElementChild;

    expect(icon).toHaveAttribute('aria-hidden', 'true');

    expectIcon[status]?.(icon as Element);
  });

  it('numbers a waiting step by its position', () => {
    render(<StepProgress steps={STEPS} />);

    const item = screen.getByText('Borrow').closest('li') as HTMLElement;

    expect(item.firstElementChild).toHaveTextContent('4');
  });

  it('marks only the active step as the current one', () => {
    render(<StepProgress steps={STEPS} />);

    const items = screen.getAllByRole('listitem');
    const current = items.filter((item) => item.hasAttribute('aria-current'));

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('aria-current', 'step');
    expect(current[0]).toHaveTextContent('Supply collateral');
  });

  it('marks no step current when none is active', () => {
    render(
      <StepProgress
        steps={[
          { label: 'Approve', status: 'done' },
          { label: 'Borrow', status: 'done' },
        ]}
      />,
    );

    screen.getAllByRole('listitem').forEach((item) => {
      expect(item).not.toHaveAttribute('aria-current');
    });
  });
});
