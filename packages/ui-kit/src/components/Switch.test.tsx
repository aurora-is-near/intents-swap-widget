// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

afterEach(cleanup);

const LABEL = 'Send to another wallet';

describe('Switch', () => {
  it('has role switch, named by its aria-label when there is no label', () => {
    render(<Switch aria-label={LABEL} />);

    const control = screen.getByRole('switch', { name: LABEL });

    expect(control).not.toBeChecked();
  });

  it('toggles on Space and fires onCheckedChange', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch aria-label={LABEL} onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('switch');

    await user.tab();

    expect(control).toHaveFocus();

    await user.keyboard(' ');

    expect(control).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]?.[0]).toBe(true);

    await user.keyboard(' ');

    expect(control).not.toBeChecked();
    expect(onCheckedChange.mock.calls[1]?.[0]).toBe(false);
  });

  it('toggles when its visible label is clicked, and is named by it', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch label={LABEL} onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('switch', { name: LABEL });

    await user.click(screen.getByText(LABEL));

    expect(control).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it('renders the label row as a real <label>', () => {
    render(<Switch label={LABEL} />);

    const row = screen.getByText(LABEL).closest('label');

    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByRole('switch'));
    expect(row?.className.split(' ')).toEqual(
      expect.arrayContaining(['gap-[12px]', 'text-[16px]']),
    );
  });

  it('disabled blocks Space, clicks and label clicks', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch disabled label={LABEL} onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('switch');

    expect(control).toHaveAttribute('aria-disabled', 'true');

    control.focus();
    await user.keyboard(' ');
    await user.click(control);
    await user.click(screen.getByText(LABEL));

    expect(control).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('follows a controlled checked value and styles it with data-checked', () => {
    render(<Switch aria-label={LABEL} checked />);

    const control = screen.getByRole('switch');

    expect(control).toBeChecked();
    expect(control).toHaveAttribute('data-checked');
    expect(control.className.split(' ')).toEqual(
      expect.arrayContaining([
        'h-[28px]',
        'w-[46px]',
        'rounded-[14px]',
        'bg-mid2',
        'data-checked:bg-ink',
      ]),
    );
  });

  it('forwards its ref to the switch and merges className', () => {
    const ref = createRef<HTMLElement>();

    render(<Switch ref={ref} aria-label={LABEL} className="extra" />);

    const control = screen.getByRole('switch');

    expect(ref.current).toBe(control);
    expect(control).toHaveClass('extra');
  });
});
