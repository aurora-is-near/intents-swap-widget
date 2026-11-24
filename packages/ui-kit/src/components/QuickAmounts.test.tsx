// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuickAmounts } from './QuickAmounts';

afterEach(cleanup);

const OPTIONS = [
  { value: '0.25', label: '25%' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: 'max', label: 'Max' },
];

function Controlled({ onSelect }: { onSelect: (value: string) => void }) {
  const [value, setValue] = useState<string>();

  return (
    <QuickAmounts
      aria-label="Amount to repay"
      onSelect={(next) => {
        setValue(next);
        onSelect(next);
      }}
      options={OPTIONS}
      value={value}
    />
  );
}

describe('QuickAmounts', () => {
  it('renders a named group of unpressed buttons', () => {
    render(<QuickAmounts onSelect={vi.fn()} options={OPTIONS} />);

    const buttons = screen.getAllByRole('button');

    expect(buttons.map((button) => button.textContent)).toEqual([
      '25%',
      '50%',
      '75%',
      'Max',
    ]);

    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('a click calls onSelect and sets aria-pressed on that chip only', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Controlled onSelect={onSelect} />);

    expect(
      screen.getByRole('group', { name: 'Amount to repay' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: '50%' }));

    expect(onSelect).toHaveBeenCalledWith('0.5');
    expect(screen.getByRole('button', { name: '50%' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Max' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Max' }));

    expect(onSelect).toHaveBeenLastCalledWith('max');
    expect(screen.getByRole('button', { name: '50%' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Max' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('works from the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<QuickAmounts onSelect={onSelect} options={OPTIONS} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('0.25');
  });

  it('styles the selected chip with aria-pressed, from .pct', () => {
    render(<QuickAmounts onSelect={vi.fn()} options={OPTIONS} value="max" />);

    expect(
      screen.getByRole('button', { name: 'Max' }).className.split(' '),
    ).toEqual(
      expect.arrayContaining([
        'flex-1',
        'rounded-[10px]',
        'border-[1.5px]',
        'border-bd2',
        'px-[14px]',
        'py-[8px]',
        'text-[14px]',
        'font-bold',
        'aria-pressed:bg-ink',
        'aria-pressed:text-sf',
        'aria-pressed:border-ink',
      ]),
    );
  });
});
