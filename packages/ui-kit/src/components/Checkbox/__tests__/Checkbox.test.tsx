import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../Checkbox';

const LABEL = 'Send borrowed funds to another wallet';

describe('Checkbox', () => {
  it('has role checkbox, named by its aria-label when there is no label', () => {
    render(<Checkbox aria-label={LABEL} />);

    expect(screen.getByRole('checkbox', { name: LABEL })).not.toBeChecked();
  });

  it('toggles on Space, fires onCheckedChange and shows the check', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Checkbox aria-label={LABEL} onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('checkbox');

    expect(control.querySelector('svg')).toBeNull();

    await user.tab();

    expect(control).toHaveFocus();

    await user.keyboard(' ');

    expect(control).toBeChecked();
    expect(control.querySelector('svg')).not.toBeNull();
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]?.[0]).toBe(true);

    await user.keyboard(' ');

    expect(control).not.toBeChecked();
    expect(onCheckedChange.mock.calls[1]?.[0]).toBe(false);
  });

  it('toggles when its visible label is clicked, and is named by it', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Checkbox label={LABEL} onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('checkbox', { name: LABEL });

    await user.click(screen.getByText(LABEL));

    expect(control).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it('renders the label row as a real <label>', () => {
    render(<Checkbox label={LABEL} />);

    const row = screen.getByText(LABEL).closest('label');

    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByRole('checkbox'));
    expect(row?.className.split(' ')).toEqual(
      expect.arrayContaining(['gap-3', 'text-16']),
    );
  });

  it('disabled blocks Space, clicks and label clicks', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox disabled label={LABEL} onCheckedChange={onCheckedChange} />,
    );

    const control = screen.getByRole('checkbox');

    expect(control).toHaveAttribute('aria-disabled', 'true');

    control.focus();
    await user.keyboard(' ');
    await user.click(control);
    await user.click(screen.getByText(LABEL));

    expect(control).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('follows a controlled checked value and styles it with data-checked', () => {
    render(<Checkbox aria-label={LABEL} checked />);

    const control = screen.getByRole('checkbox');

    expect(control).toBeChecked();
    expect(control).toHaveAttribute('data-checked');
    expect(control.className.split(' ')).toEqual(
      expect.arrayContaining([
        'size-6',
        'rounded-7',
        'border-2',
        'border-mid',
        'bg-sf',
        'data-checked:bg-ink',
        'data-checked:border-ink',
      ]),
    );
  });

  it('forwards its ref to the box and merges className', () => {
    const ref = createRef<HTMLElement>();

    render(<Checkbox ref={ref} aria-label={LABEL} className="extra" />);

    const control = screen.getByRole('checkbox');

    expect(ref.current).toBe(control);
    expect(control).toHaveClass('extra');
  });
});
