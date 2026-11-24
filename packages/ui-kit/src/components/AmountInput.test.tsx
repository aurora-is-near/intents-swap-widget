// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AmountInput, type AmountInputProps } from './AmountInput';

afterEach(cleanup);

const LABEL = 'Collateral amount';

/** A controlled AmountInput, as an app holds it, reporting each change. */
function Controlled({
  onChange,
  initial = '',
  ...props
}: Partial<AmountInputProps> & {
  onChange?: (value: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);

  return (
    <AmountInput
      hideLabel
      label={LABEL}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      value={value}
      {...props}
    />
  );
}

describe('AmountInput', () => {
  it('is a text input with the decimal keypad, named by its label', () => {
    render(<Controlled />);

    const input = screen.getByRole('textbox', { name: LABEL });

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAttribute('placeholder', '0');
  });

  it('reaches the input by a visible label too', () => {
    render(<Controlled hideLabel={false} />);

    expect(screen.getByText(LABEL)).toBeVisible();
    expect(screen.getByRole('textbox', { name: LABEL })).toBeInTheDocument();
  });

  it('turns a typed comma into a dot: 1,5 gives 1.5', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole('textbox');

    await user.type(input, '1,5');

    expect(input).toHaveValue('1.5');
    expect(onChange).toHaveBeenLastCalledWith('1.5');
  });

  it('rejects letters', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole('textbox');

    await user.type(input, '2a');

    expect(input).toHaveValue('2');

    onChange.mockClear();
    await user.type(input, 'xyz-e');

    expect(input).toHaveValue('2');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('holds the decimals cap', async () => {
    const user = userEvent.setup();

    render(<Controlled decimals={2} />);

    const input = screen.getByRole('textbox');

    await user.type(input, '3.14159');

    expect(input).toHaveValue('3.14');
  });

  it('shows the secondary line', () => {
    render(<Controlled secondary="≈ $1,234.00" />);

    expect(screen.getByText('≈ $1,234.00')).toBeInTheDocument();
  });

  it('disabled blocks typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Controlled disabled onChange={onChange} />);

    const input = screen.getByRole('textbox');

    expect(input).toBeDisabled();

    await user.type(input, '5');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the caret where the edit was when cleaning rewrites it', async () => {
    const user = userEvent.setup();

    render(<Controlled initial="125" />);

    const input = screen.getByRole<HTMLInputElement>('textbox');

    input.focus();
    input.setSelectionRange(1, 1);
    await user.keyboard(',');

    expect(input).toHaveValue('1.25');
    expect(input.selectionStart).toBe(2);

    await user.keyboard('7');

    expect(input).toHaveValue('1.725');
  });

  it('keeps the caret where it was when an edit is dropped', async () => {
    const user = userEvent.setup();

    render(<Controlled initial="125" />);

    const input = screen.getByRole<HTMLInputElement>('textbox');

    input.focus();
    input.setSelectionRange(1, 1);
    await user.keyboard('a');

    expect(input).toHaveValue('125');
    expect(input.selectionStart).toBe(1);

    await user.keyboard('9');

    expect(input).toHaveValue('1925');
  });

  it('keeps the caret before the digits when a leading zero collapses', async () => {
    const user = userEvent.setup();

    render(<Controlled initial="12" />);

    const input = screen.getByRole<HTMLInputElement>('textbox');

    input.focus();
    input.setSelectionRange(0, 0);
    await user.keyboard('0');

    expect(input).toHaveValue('12');
    expect(input.selectionStart).toBe(0);

    await user.keyboard('9');

    expect(input).toHaveValue('912');
  });

  it('forwards its ref to the input and puts className on the field wrapper', () => {
    const ref = createRef<HTMLInputElement>();

    render(
      <AmountInput
        ref={ref}
        className="extra"
        label={LABEL}
        onValueChange={vi.fn()}
        value=""
      />,
    );

    const input = screen.getByRole('textbox');

    const box = input.parentElement;

    expect(ref.current).toBe(input);
    expect(box).toHaveClass('bg-sf3', 'rounded-[14px]');
    expect(box).not.toHaveClass('extra');
    expect(box?.parentElement).toHaveClass('extra', 'min-w-0');
  });
});
