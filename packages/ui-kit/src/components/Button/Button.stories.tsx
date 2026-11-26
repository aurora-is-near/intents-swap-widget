import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import type { ButtonVariant } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Borrow USDC', variant: 'primary', size: 'lg' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'danger', 'secondary', 'ghost', 'link'],
    },
    size: { control: 'inline-radio', options: ['lg', 'md'] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Loading: Story = {
  args: { loading: true, children: 'Borrowing' },
};

export const Disabled: Story = { args: { disabled: true } };

const SIZED: readonly ButtonVariant[] = ['primary', 'danger'];

/** Every variant, size and state, as the artboards draw them. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {SIZED.map((variant) => (
          <div className="flex flex-col gap-3" key={variant}>
            <Button variant={variant}>Borrow USDC</Button>
            <Button disabled variant={variant}>
              Disabled
            </Button>
            <Button loading variant={variant}>
              Borrowing
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button size="md" variant={variant}>
                Start a new loan
              </Button>
              <Button disabled size="md" variant={variant}>
                Disabled
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary">Max</Button>
        <Button disabled variant="secondary">
          Disabled
        </Button>
        <Button variant="ghost">Positions</Button>
        <Button disabled variant="ghost">
          Disabled
        </Button>
      </div>
    </div>
  ),
};
