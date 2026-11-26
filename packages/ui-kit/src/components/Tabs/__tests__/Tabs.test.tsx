import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEG_CLASSES } from '../../../utils/segClasses';
import { Button } from '../../Button/Button';
import { Tab, Tabs, TabsList, TabsPanel } from '../Tabs';

const classesOf = (element: Element) => element.className.split(' ');

function BorrowTabs({
  count,
  onValueChange,
  disableSecond = false,
}: {
  count?: number;
  onValueChange?: (value: string) => void;
  disableSecond?: boolean;
}) {
  return (
    <Tabs defaultValue="new" onValueChange={onValueChange}>
      <TabsList aria-label="Borrow views">
        <Tab value="new">New loan</Tab>
        <Tab count={count} disabled={disableSecond} value="positions">
          My positions
        </Tab>
      </TabsList>
      <TabsPanel value="new">New loan form</TabsPanel>
      <TabsPanel value="positions">Your positions</TabsPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders tablist, tab and tabpanel roles with aria-selected', () => {
    render(<BorrowTabs />);

    expect(
      screen.getByRole('tablist', { name: 'Borrow views' }),
    ).toBeInTheDocument();

    const [first, second] = screen.getAllByRole('tab');

    expect(first).toHaveAccessibleName('New loan');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('New loan form');
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<BorrowTabs onValueChange={onValueChange} />);

    const first = screen.getByRole('tab', { name: 'New loan' });
    const second = screen.getByRole('tab', { name: 'My positions' });

    await user.tab();

    expect(first).toHaveFocus();

    await user.keyboard('{ArrowRight}');

    expect(second).toHaveFocus();

    // Activation follows a click or Enter/Space on the focused tab.
    await user.keyboard('{Enter}');

    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('positions');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Your positions');

    await user.keyboard('{ArrowLeft}');

    expect(first).toHaveFocus();
  });

  it('selects a tab on click', async () => {
    const user = userEvent.setup();

    render(<BorrowTabs />);

    await user.click(screen.getByRole('tab', { name: 'My positions' }));

    expect(screen.getByRole('tab', { name: 'My positions' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('renders the count as part of the tab’s accessible name', () => {
    render(<BorrowTabs count={2} />);

    const tab = screen.getByRole('tab', { name: 'My positions 2' });
    const badge = tab.querySelector('[data-slot="count"]');

    expect(badge).toHaveTextContent('2');
    expect(classesOf(badge as Element)).toEqual(
      expect.arrayContaining([
        'bg-accent',
        'text-onlime',
        'rounded-full',
        'px-2',
        'text-13',
      ]),
    );
  });

  it('shows a zero count and hides an undefined one', () => {
    const { rerender } = render(<BorrowTabs count={0} />);

    expect(
      screen.getByRole('tab', { name: 'My positions 0' }),
    ).toBeInTheDocument();

    rerender(<BorrowTabs />);

    const tab = screen.getByRole('tab', { name: 'My positions' });

    expect(tab.querySelector('[data-slot="count"]')).toBeNull();
  });

  it('a disabled tab cannot be selected', async () => {
    const user = userEvent.setup();

    render(<BorrowTabs disableSecond />);

    const second = screen.getByRole('tab', { name: 'My positions' });

    await user.click(second);

    expect(second).toHaveAttribute('aria-selected', 'false');
    expect(classesOf(second)).toEqual(
      expect.arrayContaining(['data-disabled:opacity-45']),
    );
  });

  it('styles each tab as the .seg pill, selected ink', () => {
    render(<BorrowTabs />);

    const classes = classesOf(screen.getByRole('tab', { name: 'New loan' }));

    expect(classes).toEqual(
      expect.arrayContaining([
        ...SEG_CLASSES.split(' '),
        'inline-flex',
        'gap-2',
        'font-bold',
        'leading-font',
        'data-active:bg-ink',
        'data-active:text-sf',
        'data-active:border-ink',
      ]),
    );
  });

  it('shares the .seg classes with Button’s secondary variant', () => {
    render(<Button variant="secondary">Max</Button>);

    expect(classesOf(screen.getByRole('button'))).toEqual(
      expect.arrayContaining(SEG_CLASSES.split(' ')),
    );
  });
});
