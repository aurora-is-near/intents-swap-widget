import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RecipientField } from '../RecipientField';

const VALID = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

/** The field with the form's rule: unchecking clears the address. */
function Harness() {
  const [enabled, setEnabled] = useState(false);
  const [value, setValue] = useState('');

  return (
    <>
      <RecipientField
        enabled={enabled}
        value={value}
        onEnabledChange={(next) => {
          setEnabled(next);

          if (!next) {
            setValue('');
          }
        }}
        onValueChange={setValue}
      />
      <button type="button">elsewhere</button>
    </>
  );
}

const checkbox = () =>
  screen.getByRole('checkbox', {
    name: 'Send borrowed funds to another wallet',
  });

const ADDRESS = { name: 'Recipient wallet address' };

const addressField = () => screen.getByRole('textbox', ADDRESS);

const queryAddressField = () => screen.queryByRole('textbox', ADDRESS);

describe('RecipientField', () => {
  it('reveals the address field, with the 0x… placeholder, on check', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    expect(checkbox()).not.toBeChecked();
    expect(queryAddressField()).not.toBeInTheDocument();

    await user.click(checkbox());

    expect(checkbox()).toBeChecked();
    expect(addressField()).toHaveAttribute('placeholder', '0x…');
  });

  it('shows an inline error for an invalid address once the field is left', async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(checkbox());
    await user.type(addressField(), 'name.eth');

    // Not while typing.
    expect(addressField()).not.toHaveAttribute('aria-invalid');

    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(addressField()).toHaveAttribute('aria-invalid', 'true');
    expect(addressField()).toHaveAccessibleDescription(
      'Enter a valid EVM address (0x…)',
    );
  });

  it('flags a full-length invalid address as it is typed', async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(checkbox());
    await user.type(addressField(), `0x${'z'.repeat(40)}`);

    expect(
      screen.getByText('Enter a valid EVM address (0x…)'),
    ).toBeInTheDocument();
  });

  it('accepts a valid address', async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(checkbox());
    await user.type(addressField(), `0x1`);
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    await user.clear(addressField());
    await user.type(addressField(), VALID);

    expect(addressField()).toHaveValue(VALID);
    expect(addressField()).not.toHaveAttribute('aria-invalid');
    expect(
      screen.queryByText('Enter a valid EVM address (0x…)'),
    ).not.toBeInTheDocument();
  });

  describe('locked, for a non-EVM wallet', () => {
    const REASON = "Required: your wallet can't receive on Base";

    const renderLocked = () => {
      const onEnabledChange = vi.fn();

      render(
        <RecipientField
          enabled={false}
          lockedReason={REASON}
          value=""
          onEnabledChange={onEnabledChange}
          onValueChange={() => {}}
        />,
      );

      return { onEnabledChange };
    };

    it('is on and disabled, with the reason under it', () => {
      renderLocked();

      expect(checkbox()).toBeChecked();
      expect(checkbox()).toHaveAttribute('aria-disabled', 'true');
      expect(checkbox()).toHaveAccessibleDescription(REASON);
      expect(screen.getByText(REASON)).toBeVisible();
      expect(addressField()).toBeInTheDocument();
    });

    it('can not be turned off', async () => {
      const user = userEvent.setup();
      const { onEnabledChange } = renderLocked();

      await user.click(checkbox());

      expect(checkbox()).toBeChecked();
      expect(onEnabledChange).not.toHaveBeenCalled();
      expect(addressField()).toBeInTheDocument();
    });
  });

  it('with an EVM wallet, is off, enabled and has no reason', () => {
    render(<Harness />);

    expect(checkbox()).not.toBeChecked();
    expect(checkbox()).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(/^Required:/)).not.toBeInTheDocument();
  });

  it('hides and clears the address on uncheck', async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(checkbox());
    await user.type(addressField(), VALID);
    await user.click(checkbox());

    expect(queryAddressField()).not.toBeInTheDocument();

    await user.click(checkbox());

    expect(addressField()).toHaveValue('');
  });
});
