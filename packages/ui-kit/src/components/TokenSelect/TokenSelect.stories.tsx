import { useRef, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
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
import {
  ONE_OPTION,
  WORST_OPTIONS,
  WORST_SELECTED,
} from '../../stories/worstCaseTokens';
import type { TokenOption } from '../TokenList/TokenList';
import type { TokenSelectProps } from './TokenSelect';

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

type Dataset = 'demo' | 'worst' | 'empty' | 'one';

const DEMO_SELECTED: TokenSelectProps['selected'] = {
  symbol: 'ETH',
  mark: { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
  chainName: CHAINS.eth.name,
  chainColor: CHAINS.eth.color,
};

const DATASETS: Record<
  Dataset,
  {
    label: string;
    options: readonly TokenOption[];
    selected: TokenSelectProps['selected'];
  }
> = {
  demo: { label: 'Demo data', options: OPTIONS, selected: DEMO_SELECTED },
  worst: {
    label: 'Worst case',
    options: WORST_OPTIONS,
    selected: WORST_SELECTED,
  },
  empty: { label: 'Empty', options: [], selected: DEMO_SELECTED },
  one: { label: 'One', options: ONE_OPTION, selected: DEMO_SELECTED },
};

/** The dataset switch: dev chrome, not part of the design under test. */
function DatasetSwitch({
  value,
  onChange,
}: {
  value: Dataset;
  onChange: (value: Dataset) => void;
}) {
  return (
    <div
      className="fixed bottom-4 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-[#E5E5E5] p-0.5"
      role="radiogroup"
      style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
      {(Object.keys(DATASETS) as Dataset[]).map((key) => (
        <button
          key={key}
          aria-checked={value === key}
          className={`cursor-pointer rounded-full border-0 px-3 py-1 ${value === key ? 'bg-white text-black shadow-sm' : 'bg-transparent text-[#555]'}`}
          onClick={() => onChange(key)}
          role="radio"
          type="button">
          {DATASETS[key].label}
        </button>
      ))}
    </div>
  );
}

/** The Supply card's picker row in a 320px phone frame (card padding 16). */
function PhonePickerRow({ dataset }: { dataset: (typeof DATASETS)[Dataset] }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState('');

  return (
    <div className="box-border w-80 rounded-18 border-1.5 border-solid border-bd bg-sf p-4">
      <div ref={anchor} className="flex items-stretch gap-2">
        <TokenSelect
          anchor={anchor}
          aria-label="Choose collateral token"
          className="w-47 shrink-0"
          onValueChange={fn()}
          options={dataset.options}
          selected={dataset.selected}
          value={dataset.options[0]?.id}
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
    </div>
  );
}

/**
 * Break-test: the picker with demo data, the worst realistic data, no
 * tokens and one token (the switch at the bottom; kept in the URL). Two
 * frames: the trigger alone, its popup as wide as the 188px trigger, and
 * the Supply card's row at a 320px phone width, the popup as wide as the
 * row.
 */
export const StressTest: StoryObj<{ data: Dataset }> = {
  args: { data: 'worst' },
  argTypes: {
    data: { control: 'inline-radio', options: Object.keys(DATASETS) },
  },
  render: function StressTestRender({ data }) {
    const [, updateArgs] = useArgs<{ data: Dataset }>();
    const dataset = DATASETS[data];

    return (
      <div className="flex flex-col gap-10 pb-16">
        <section className="flex flex-col gap-2">
          <span className="text-12 text-mut">Trigger alone (188px)</span>
          <TokenSelect
            aria-label="Choose collateral token"
            className="w-47"
            onValueChange={fn()}
            options={dataset.options}
            selected={dataset.selected}
            value={dataset.options[0]?.id}
          />
        </section>
        <section className="flex flex-col gap-2">
          <span className="text-12 text-mut">Supply row at 320px</span>
          <PhonePickerRow dataset={dataset} />
        </section>
        <DatasetSwitch
          onChange={(next) => updateArgs({ data: next })}
          value={data}
        />
      </div>
    );
  },
};
