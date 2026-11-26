import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './Skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  args: { width: 240, height: 16, radius: 8 },
  argTypes: {
    width: { control: 'number' },
    height: { control: 'number' },
    radius: { control: 'select', options: [0, 4, 8, 12, 17] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A number is px; a string is any CSS length, such as `40%` (see Token rows). */
export const Playground: Story = {};

/** A radius of half its equal sides: a token or avatar placeholder. */
export const Circle: Story = {
  args: { width: 34, height: 34, radius: 17 },
};

/** No width: the block fills its container. */
export const FullWidth: Story = {
  args: { width: undefined },
  render: (args) => (
    <div className="max-w-115">
      <Skeleton {...args} />
    </div>
  ),
};

/**
 * A token row while prices load: mark, two lines, price. The region it
 * stands in for carries `aria-busy`; the blocks are hidden from assistive
 * technology.
 */
export const TokenRows: Story = {
  render: () => (
    <div
      aria-busy="true"
      aria-label="Loading tokens"
      className="flex max-w-115 flex-col gap-3"
      role="group">
      {[0, 1].map((row) => (
        <div className="flex items-center gap-3" key={row}>
          <Skeleton height={34} radius={17} width={34} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton height={16} width="40%" />
            <Skeleton height={12} width="70%" />
          </div>
          <Skeleton height={16} width={64} />
        </div>
      ))}
    </div>
  ),
};
