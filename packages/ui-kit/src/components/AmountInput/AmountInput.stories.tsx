import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AmountInput } from './AmountInput';
import type { AmountInputProps } from './AmountInput';

/** Keeps the typed amount in local state, seeded from the story's `value`. */
function ControlledAmountInput({
  value: initial,
  onValueChange,
  ...props
}: AmountInputProps) {
  const [value, setValue] = useState(initial);

  return (
    <AmountInput
      {...props}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
      value={value}
    />
  );
}

const meta = {
  title: 'Components/AmountInput',
  component: AmountInput,
  args: {
    label: 'Collateral amount',
    hideLabel: true,
    value: '',
    decimals: 6,
    secondary: '≈ $1,234.00',
    placeholder: '0',
    disabled: false,
    onValueChange: fn(),
  },
  argTypes: {
    decimals: { control: { type: 'number', min: 0, max: 18 } },
    secondary: { control: 'text' },
    label: { control: 'text' },
  },
  render: (args) => (
    <div className="max-w-140">
      <ControlledAmountInput {...args} />
    </div>
  ),
} satisfies Meta<typeof AmountInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Type an amount: letters and a second dot are dropped, `,` becomes `.`. */
export const Playground: Story = {};

/** A visible label above the box, as a form field. */
export const WithLabel: Story = {
  args: { label: 'SUPPLY', hideLabel: false, value: '1.5' },
};

/** At most two fraction digits, such as a fiat amount. */
export const LimitedDecimals: Story = {
  args: { decimals: 2, value: '12.34', secondary: 'Two decimals at most' },
};

export const Disabled: Story = {
  args: {
    label: 'SUPPLY',
    hideLabel: false,
    value: '1.5',
    secondary: 'Disabled',
    disabled: true,
  },
};
