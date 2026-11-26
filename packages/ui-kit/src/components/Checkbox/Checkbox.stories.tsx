import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: {
    label: 'Send borrowed funds to another wallet',
    disabled: false,
    onCheckedChange: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Uncontrolled: click the box or its label, or press Space. */
export const Playground: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true, label: 'Disabled' } };

export const DisabledChecked: Story = {
  args: { checked: true, disabled: true, label: 'Disabled, checked' },
};

/** No visible label: name it with `aria-label` instead. */
export const Unlabelled: Story = {
  args: { label: undefined, 'aria-label': 'Unlabelled checkbox' },
};

function CheckboxStates() {
  const [sendOther, setSendOther] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        checked={sendOther}
        label="Send borrowed funds to another wallet"
        onCheckedChange={setSendOther}
      />
      <div className="flex flex-wrap items-center gap-6">
        <Checkbox aria-label="Unlabelled checkbox" />
        <Checkbox disabled label="Disabled" />
        <Checkbox checked disabled label="Disabled, checked" />
      </div>
    </div>
  );
}

/** A controlled checkbox and every state. */
export const AllStates: Story = {
  render: () => <CheckboxStates />,
};
