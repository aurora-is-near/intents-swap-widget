import type { Meta, StoryObj } from '@storybook/react-vite';

import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  args: { size: 22, tone: 'default', label: 'Loading' },
  argTypes: {
    size: { control: { type: 'number', min: 8, max: 64, step: 1 } },
    tone: { control: 'inline-radio', options: ['default', 'current'] },
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The 20px spinner of an in-progress transaction step. */
export const Small: Story = { args: { size: 20 } };

/** `tone="current"` follows the text colour, for use inside a button. */
export const CurrentColour: Story = {
  args: { tone: 'current' },
  render: (args) => (
    <span className="flex items-center gap-2 text-neg">
      <Spinner {...args} /> current colour
    </span>
  ),
};

/** Every size and tone. */
export const AllSpinners: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <Spinner />
      <Spinner size={20} />
      <span className="flex items-center gap-2 text-neg">
        <Spinner tone="current" /> current colour
      </span>
    </div>
  ),
};
