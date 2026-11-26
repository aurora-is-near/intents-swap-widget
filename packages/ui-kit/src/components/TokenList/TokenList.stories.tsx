import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TokenList, TokenRow } from './TokenList';
import type { TokenOption } from './TokenList';
import {
  HELD_OPTIONS,
  OPTIONS,
  sampleOption,
} from '../../stories/sampleTokens';

const meta = {
  title: 'Components/TokenList',
  component: TokenList,
  subcomponents: { TokenRow },
  args: { 'aria-label': 'Tokens' },
  decorators: [
    (Story) => (
      <div className="max-w-105">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TokenList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <TokenList {...args}>
      {OPTIONS.map((option) => (
        <TokenRow
          key={option.id}
          option={option}
          selected={option.id === 'eth'}
        />
      ))}
    </TokenList>
  ),
};

function SelectableList({ options }: { options: readonly TokenOption[] }) {
  const [value, setValue] = useState('eth');

  return (
    <TokenList aria-label="Tokens">
      {options.map((option) => (
        <TokenRow
          key={option.id}
          onClick={() => setValue(option.id)}
          option={option}
          selected={option.id === value}
        />
      ))}
    </TokenList>
  );
}

/** Rows are plain buttons; the chosen one is `aria-pressed`. */
export const Selectable: Story = {
  render: () => <SelectableList options={OPTIONS} />,
};

/**
 * Held balances in place of prices; cbBTC is held but unavailable, so its
 * row is disabled with the reason after its chains.
 */
export const WithBalances: Story = {
  render: () => <SelectableList options={HELD_OPTIONS} />,
};

/** A single `TokenRow` in each of its states. */
export const RowStates: Story = {
  render: (args) => (
    <TokenList {...args}>
      <TokenRow option={sampleOption('wsteth')} />
      <TokenRow option={sampleOption('eth')} selected />
      <TokenRow option={HELD_OPTIONS[0] ?? sampleOption('eth')} />
      <TokenRow option={HELD_OPTIONS[2] ?? sampleOption('cbbtc')} />
      <TokenRow disabled option={sampleOption('usds')} />
    </TokenList>
  ),
};
