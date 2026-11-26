import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: {
    label: 'RECIPIENT',
    placeholder: '0x… or name.eth',
    hideLabel: false,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    hideLabel: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  // Single fields at a form's width; a story with `wide` lays out its own.
  decorators: [
    (Story, context) =>
      context.parameters.wide === true ? (
        <Story />
      ) : (
        <div className="max-w-90">
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The label is hidden visually, as on the artboards; screen readers read it. */
export const HiddenLabel: Story = {
  args: { label: 'Recipient wallet address', hideLabel: true },
};

/** `error` marks the input invalid, turns the border `neg` and describes it. */
export const WithError: Story = {
  args: {
    label: 'WITH AN ERROR',
    defaultValue: '0x12',
    error: 'Not a valid address',
  },
};

export const Disabled: Story = { args: { label: 'DISABLED', disabled: true } };

function RecipientField() {
  const [address, setAddress] = useState('');

  return (
    <TextField
      hideLabel
      label="Recipient wallet address"
      onChange={(event) => setAddress(event.target.value)}
      placeholder="0x… or name.eth"
      value={address}
    />
  );
}

/** Controlled with `value` and `onChange`. */
export const Controlled: Story = {
  render: () => <RecipientField />,
};

/** Every state. */
export const AllStates: Story = {
  parameters: { wide: true },
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      <RecipientField />
      <TextField label="RECIPIENT" placeholder="0x… or name.eth" />
      <TextField
        defaultValue="0x12"
        error="Not a valid address"
        label="WITH AN ERROR"
      />
      <TextField disabled label="DISABLED" placeholder="0x… or name.eth" />
    </div>
  ),
};
