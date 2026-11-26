import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from '../Text/Text';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  render: (args) => (
    <Card {...args} className="max-w-90">
      <Text variant="label">ACTIVE LOAN</Text>
      <p className="mt-2 mb-0">22px padding, 16px at 640px or narrower.</p>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The 1.5px `--bd` border and 24px radius on `--sf`. */
export const Default: Story = {};

/** A caller's padding class replaces the card's at every width. */
export const CustomPadding: Story = {
  render: (args) => (
    <Card {...args} className="max-w-90 p-8">
      <Text variant="label">CUSTOM PADDING</Text>
      <p className="mt-2 mb-0">p-8 (32px) at every width.</p>
    </Card>
  ),
};
