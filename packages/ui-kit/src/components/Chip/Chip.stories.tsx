import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FilterChips } from '../../stories/filterChips';
import { Chip } from './Chip';
import type { ChainId, Group } from '../../stories/filterChips';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: {
    children: 'Stables',
    pressed: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    children: { control: 'text' },
    dotColor: { control: 'color' },
  },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Selected: ink fill with `--sf` text, and `aria-pressed="true"`. */
export const Pressed: Story = { args: { pressed: true } };

/** A leading dot in a chain's colour. */
export const WithDot: Story = {
  args: { children: 'Ethereum', dotColor: '#5B74D6' },
};

export const Disabled: Story = { args: { disabled: true } };

function FilterRowsDemo() {
  const [group, setGroup] = useState<Group>('all');
  const [chain, setChain] = useState<ChainId>('eth');

  return (
    <div className="max-w-115">
      <FilterChips
        chain={chain}
        group={group}
        onChainChange={setChain}
        onGroupChange={setGroup}
      />
    </div>
  );
}

/** The token picker's filter rows: a token group and a chain, one of each. */
export const FilterRows: Story = {
  render: () => <FilterRowsDemo />,
};

/** Every state, plain and with a dot. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>All</Chip>
        <Chip pressed>Stables</Chip>
        <Chip disabled>Disabled</Chip>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip dotColor="#5B74D6">Ethereum</Chip>
        <Chip dotColor="#2E6BFF" pressed>
          Base
        </Chip>
        <Chip disabled dotColor="#D9341F">
          Optimism
        </Chip>
      </div>
    </div>
  ),
};
