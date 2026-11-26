import type { Meta, StoryObj } from '@storybook/react-vite';

import { Highlight } from '../Highlight/Highlight';
import { Text } from './Text';

const meta = {
  title: 'Components/Text',
  component: Text,
  args: { variant: 'h64', children: 'Borrow easy' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['h64', 'label'],
    },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The hero heading, with a `Highlight` on one word. */
export const WithHighlight: Story = {
  render: (args) => (
    <Text {...args}>
      Borrow <Highlight>easy</Highlight>
    </Text>
  ),
};

/** The small caps-style section label (`.lbl`). */
export const Label: Story = {
  args: { variant: 'label', children: 'ACTIVE LOAN' },
};

/** Both variants. */
export const TypeScale: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Text variant="h64">
        Borrow <Highlight>easy</Highlight>
      </Text>
      <Text variant="label">ACTIVE LOAN</Text>
    </div>
  ),
};
