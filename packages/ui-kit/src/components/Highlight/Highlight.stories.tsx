import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from '../Text/Text';
import { Highlight } from './Highlight';

const meta = {
  title: 'Components/Highlight',
  component: Highlight,
  args: { children: 'easy' },
  argTypes: { children: { control: 'text' } },
} satisfies Meta<typeof Highlight>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The lime word mark inside a heading; it takes the heading's type. */
export const InHeading: Story = {
  render: (args) => (
    <Text variant="h64">
      Borrow <Highlight {...args} />
    </Text>
  ),
};
