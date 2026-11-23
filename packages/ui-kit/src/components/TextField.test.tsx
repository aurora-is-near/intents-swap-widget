// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextField } from './TextField';

afterEach(cleanup);

const LABEL = 'Recipient wallet address';

describe('TextField', () => {
  it('is a textbox named by its label, with autocomplete and spellcheck off', () => {
    render(<TextField label={LABEL} placeholder="0x… or name.eth" />);

    const input = screen.getByRole('textbox', { name: LABEL });

    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('placeholder', '0x… or name.eth');
  });

  it('hideLabel keeps the label for screen readers only', () => {
    render(<TextField hideLabel label={LABEL} />);

    expect(screen.getByText(LABEL)).toHaveClass('sr-only');
    expect(screen.getByRole('textbox', { name: LABEL })).toBeInTheDocument();
  });

  it('takes native props and reports typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TextField label={LABEL} name="recipient" onChange={onChange} />);

    const input = screen.getByRole('textbox');

    await user.type(input, 'bob.eth');

    expect(input).toHaveValue('bob.eth');
    expect(input).toHaveAttribute('name', 'recipient');
    expect(onChange).toHaveBeenCalled();
  });

  it('lets a caller turn spellcheck and autocomplete back on', () => {
    render(<TextField autoComplete="email" label={LABEL} spellCheck />);

    const input = screen.getByRole('textbox');

    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('spellcheck', 'true');
  });

  it('marks an error invalid and describes the input with it', () => {
    render(<TextField error="Not a valid address" label={LABEL} />);

    const input = screen.getByRole('textbox', { name: LABEL });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Not a valid address');
    // The box's `neg` border hangs off the field's data-invalid.
    expect(input.closest('[data-invalid]')).not.toBeNull();
    expect(input.parentElement).toHaveClass(
      'group-data-invalid/field:border-neg',
    );
  });

  it('has no error text or invalid state without an error', () => {
    render(<TextField label={LABEL} />);

    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('disabled disables the input', () => {
    render(<TextField disabled label={LABEL} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('draws the artboard box around the input', () => {
    render(<TextField label={LABEL} />);

    expect(
      screen.getByRole('textbox').parentElement?.className.split(' '),
    ).toEqual(
      expect.arrayContaining([
        'rounded-[12px]',
        'border-[1.5px]',
        'border-bd2',
        'bg-sf',
        'px-[14px]',
        'py-[11px]',
        'focus-within:border-ink',
      ]),
    );
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();

    render(<TextField ref={ref} label={LABEL} />);

    expect(ref.current).toBe(screen.getByRole('textbox'));
  });
});
