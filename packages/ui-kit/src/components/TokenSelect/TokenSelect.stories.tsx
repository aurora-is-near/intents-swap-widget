import { useRef, useState } from 'react';
import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AmountInput } from '../AmountInput/AmountInput';
import { CHAINS, FilterChips } from '../../stories/filterChips';
import { TokenSelect } from './TokenSelect';
import type { ChainId, Group } from '../../stories/filterChips';
import {
  HELD_OPTIONS,
  OPTIONS,
  SAMPLE_TOKENS,
  toOption,
} from '../../stories/sampleTokens';

const meta = {
  title: 'Components/TokenSelect',
  component: TokenSelect,
  args: {
    'aria-label': 'Choose collateral token',
    className: 'w-47',
    value: 'eth',
    options: OPTIONS,
    selected: {
      symbol: 'ETH',
      mark: { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
      chainName: CHAINS.eth.name,
      chainColor: CHAINS.eth.color,
    },
    onValueChange: fn(),
    disabled: false,
  },
  argTypes: {
    value: {
      control: 'select',
      options: SAMPLE_TOKENS.map((token) => token.id),
    },
    disabled: { control: 'boolean' },
    options: { control: false },
    filters: { control: false },
    anchor: { control: false },
  },
} satisfies Meta<typeof TokenSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Driven by args: picking a row calls `onValueChange` (see Actions) and
 * marks nothing new, since `value` and `selected` are args here.
 */
export const Playground: Story = {};

export const Disabled: Story = { args: { disabled: true } };

/** The Supply card's picker row (lines 216–228): trigger and amount field. */
function TokenPicker() {
  const anchor = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('eth');
  // The chain on the trigger changes only with a pick, so it always pairs
  // with a chain the selected token is on; the chips set the filter.
  const [chain, setChain] = useState<ChainId>('eth');
  const [filterChain, setFilterChain] = useState<ChainId>('eth');
  const [group, setGroup] = useState<Group>('all');
  const [amount, setAmount] = useState('');

  const token = SAMPLE_TOKENS.find((item) => item.id === value);

  const options = SAMPLE_TOKENS.filter(
    (item) =>
      (group === 'all' || item.group === group) &&
      item.chains.includes(filterChain),
  ).map(toOption);

  if (!token) {
    return null;
  }

  return (
    <div ref={anchor} className="flex max-w-140 items-stretch gap-2">
      <TokenSelect
        anchor={anchor}
        aria-label="Choose collateral token"
        className="w-47 shrink-0"
        filters={
          <FilterChips
            chain={filterChain}
            group={group}
            onChainChange={setFilterChain}
            onGroupChange={setGroup}
          />
        }
        onValueChange={(id) => {
          setValue(id);
          setChain(filterChain);
        }}
        options={options}
        selected={{
          symbol: token.symbol,
          mark: { label: token.label, bg: token.bg, fg: token.fg },
          chainName: CHAINS[chain].name,
          chainColor: CHAINS[chain].color,
        }}
        value={value}
      />
      <AmountInput
        className="min-w-0 flex-1"
        hideLabel
        label="Collateral amount"
        onValueChange={setAmount}
        secondary="≈ $0.00"
        value={amount}
      />
    </div>
  );
}

function HeldTokenPicker() {
  const [value, setValue] = useState('eth');
  const option =
    HELD_OPTIONS.find((item) => item.id === value) ?? HELD_OPTIONS[0];

  if (!option) {
    return null;
  }

  return (
    <TokenSelect
      aria-label="Choose a token you hold"
      className="w-47"
      onValueChange={setValue}
      options={HELD_OPTIONS}
      selected={{
        symbol: option.symbol,
        mark: option.mark,
        chainName: CHAINS.eth.name,
        chainColor: CHAINS.eth.color,
      }}
      value={value}
    />
  );
}

/**
 * The Supply card's picker: group and chain `Chip` filters above the list,
 * the popup anchored to (and as wide as) the row holding the amount field.
 */
export const WithFilters: Story = {
  render: () => <TokenPicker />,
};

/**
 * Wallet balances in place of prices. cbBTC is held but not supported, so
 * its row is disabled with the reason on its chains line.
 */
export const WithBalances: Story = {
  render: () => <HeldTokenPicker />,
};

/** Both pickers. */
export const AllPickers: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <TokenPicker />
      <HeldTokenPicker />
    </div>
  ),
};
