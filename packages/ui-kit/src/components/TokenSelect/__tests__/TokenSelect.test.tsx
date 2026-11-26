import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Chip } from '../../Chip/Chip';
import type { TokenOption } from '../../TokenList/TokenList';
import { TokenSelect } from '../TokenSelect';

const OPTIONS: TokenOption[] = [
  {
    id: 'eth',
    symbol: 'ETH',
    mark: { label: 'ET', bg: '#E8ECFB', fg: '#3C4FB8' },
    chainsLabel: 'Ethereum · Base · Arbitrum · Optimism',
    priceLabel: '$3,120.40',
  },
  {
    id: 'wbtc',
    symbol: 'WBTC',
    mark: { label: 'BT', bg: '#FDF0DF', fg: '#B25E00' },
    chainsLabel: 'Ethereum · Arbitrum',
    priceLabel: '$64,210.00',
  },
];

function Controlled({
  onValueChange,
}: {
  onValueChange: (value: string) => void;
}) {
  const [value, setValue] = useState('eth');
  const option = OPTIONS.find((item) => item.id === value) ?? OPTIONS[0];

  return (
    <TokenSelect
      aria-label="Choose collateral token"
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
      options={OPTIONS}
      selected={{
        symbol: option.symbol,
        mark: option.mark,
        chainName: 'Ethereum',
        chainColor: '#627EEA',
      }}
      value={value}
    />
  );
}

const getTrigger = () => screen.getByRole('button', { name: /Ethereum$/ });

const queryPopup = () =>
  screen.queryByRole('dialog', { name: 'Choose collateral token' });

describe('TokenSelect', () => {
  it('opens on click', async () => {
    const user = userEvent.setup();

    render(<Controlled onValueChange={vi.fn()} />);

    expect(queryPopup()).not.toBeInTheDocument();

    await user.click(getTrigger());

    expect(queryPopup()).toBeVisible();
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    expect(getTrigger()).toHaveAttribute('data-popup-open');
  });

  it('opens on Enter', async () => {
    const user = userEvent.setup();

    render(<Controlled onValueChange={vi.fn()} />);

    await user.tab();

    expect(getTrigger()).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(queryPopup()).toBeVisible();
  });

  it('shows the selected token on the trigger', () => {
    render(<Controlled onValueChange={vi.fn()} />);

    const trigger = getTrigger();

    expect(trigger).toHaveTextContent('ET');
    expect(trigger).toHaveTextContent('ETH');
    expect(trigger).toHaveTextContent('Ethereum');
  });

  it('renders mark, symbol, chains label and price per row', async () => {
    const user = userEvent.setup();

    render(<Controlled onValueChange={vi.fn()} />);
    await user.click(getTrigger());

    const popup = within(queryPopup() as HTMLElement);
    const rows = popup.getAllByRole('button');

    expect(rows).toHaveLength(2);

    OPTIONS.forEach((option, index) => {
      const row = within(rows[index]);

      expect(row.getByText(option.mark.label)).toBeInTheDocument();
      expect(row.getByText(option.symbol)).toBeInTheDocument();
      expect(row.getByText(option.chainsLabel)).toHaveClass('truncate');
      expect(row.getByText(option.priceLabel)).toBeInTheDocument();
    });
  });

  it('shows a balance label in place of the price, and the price without one', async () => {
    const user = userEvent.setup();
    const held: TokenOption[] = [
      {
        ...OPTIONS[0],
        balanceLabel: '1.25 ETH',
        balanceUsdLabel: '$3,900.50',
      },
      { ...OPTIONS[1], balanceLabel: '0.1 WBTC' },
      { ...OPTIONS[0], id: 'plain', symbol: 'wstETH' },
    ];

    render(
      <TokenSelect
        aria-label="Choose collateral token"
        onValueChange={vi.fn()}
        options={held}
        selected={{
          symbol: 'ETH',
          mark: OPTIONS[0].mark,
          chainName: 'Ethereum',
        }}
      />,
    );
    await user.click(getTrigger());

    const [withUsd, withoutUsd, plain] = within(
      queryPopup() as HTMLElement,
    ).getAllByRole('button');

    expect(withUsd).toHaveAccessibleName(/1\.25 ETH\s*\$3,900\.50$/);
    expect(withUsd).not.toHaveTextContent('$3,120.40');
    expect(withoutUsd).toHaveAccessibleName(/0\.1 WBTC$/);
    expect(withoutUsd).not.toHaveTextContent('$64,210.00');
    expect(plain).toHaveAccessibleName(/wstETH.*\$3,120\.40$/);
  });

  it('disables an unavailable row and shows its reason after the chains', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <TokenSelect
        aria-label="Choose collateral token"
        onValueChange={onValueChange}
        options={[
          OPTIONS[0],
          { ...OPTIONS[1], unavailableReason: 'Not supported yet' },
        ]}
        selected={{
          symbol: 'ETH',
          mark: OPTIONS[0].mark,
          chainName: 'Ethereum',
        }}
      />,
    );
    await user.click(getTrigger());

    const [available, unavailable] = within(
      queryPopup() as HTMLElement,
    ).getAllByRole('button');

    expect(available).toBeEnabled();
    expect(unavailable).toBeDisabled();
    expect(unavailable).toHaveTextContent(
      'Ethereum · Arbitrum · Not supported yet',
    );

    await user.click(unavailable);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('a pick calls onValueChange with the id, closes and focuses the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Controlled onValueChange={onValueChange} />);
    await user.click(getTrigger());
    await user.click(screen.getByRole('button', { name: /\$64,210\.00$/ }));

    expect(onValueChange).toHaveBeenCalledWith('wbtc');
    expect(queryPopup()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ethereum$/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Ethereum$/ })).toHaveTextContent(
      'WBTC',
    );
  });

  it('a pick from the keyboard closes and focuses the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Controlled onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard('{Enter}');

    // Focus moves into the popup, onto the first row.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /\$3,120\.40$/ }),
      ).toHaveFocus(),
    );

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('wbtc');
    expect(queryPopup()).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Controlled onValueChange={onValueChange} />);
    await user.click(getTrigger());

    expect(queryPopup()).toBeVisible();

    await user.keyboard('{Escape}');

    expect(queryPopup()).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('marks the selected row', async () => {
    const user = userEvent.setup();

    render(<Controlled onValueChange={vi.fn()} />);
    await user.click(getTrigger());

    const selected = screen.getByRole('button', { name: /\$3,120\.40$/ });
    const other = screen.getByRole('button', { name: /\$64,210\.00$/ });

    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(other).toHaveAttribute('aria-pressed', 'false');
    expect(selected.className.split(' ')).toEqual(
      expect.arrayContaining([
        'aria-pressed:bg-tint',
        'aria-pressed:border-limebd',
      ]),
    );
  });

  it('renders the filters slot above the list', async () => {
    const user = userEvent.setup();

    render(
      <TokenSelect
        aria-label="Choose collateral token"
        filters={<Chip pressed>All</Chip>}
        onValueChange={vi.fn()}
        options={OPTIONS}
        selected={{
          symbol: 'ETH',
          mark: OPTIONS[0].mark,
          chainName: 'Ethereum',
        }}
      />,
    );
    await user.click(getTrigger());

    const buttons = within(queryPopup() as HTMLElement).getAllByRole('button');

    expect(buttons[0]).toHaveTextContent('All');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Chip', () => {
  function Toggle() {
    const [pressed, setPressed] = useState(false);

    return (
      <Chip
        dotColor="#627EEA"
        onClick={() => setPressed((p) => !p)}
        pressed={pressed}>
        Ethereum
      </Chip>
    );
  }

  it('toggles aria-pressed', async () => {
    const user = userEvent.setup();

    render(<Toggle />);

    const chip = screen.getByRole('button', { name: 'Ethereum' });

    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveAttribute('type', 'button');

    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows a 7px colour dot only with dotColor', () => {
    const { rerender } = render(<Chip dotColor="#627EEA">Ethereum</Chip>);

    const dot = screen.getByRole('button').querySelector('span[aria-hidden]');

    expect(dot).toHaveClass('size-1.75', 'rounded-full');
    expect(dot).toHaveStyle({ background: '#627EEA' });

    rerender(<Chip>Ethereum</Chip>);

    expect(screen.getByRole('button').querySelector('span')).toBeNull();
  });
});
