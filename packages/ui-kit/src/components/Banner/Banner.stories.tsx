import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../Button/Button';
import { Banner } from './Banner';

const meta = {
  title: 'Components/Banner',
  component: Banner,
  args: {
    tone: 'danger',
    title: 'Transaction failed',
    children: 'The wallet rejected the request. Nothing was sent.',
    tinted: false,
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['danger', 'warning'] },
    title: { control: 'text' },
    children: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-115">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The confirm modal's error block; announced at once (`role="alert"`). */
export const Danger: Story = {};

/** The confirm modal's warning block; announced politely (`role="status"`). */
export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Taking longer than usual',
    children:
      'The bridge is still settling. You can close this window; the loan finishes on its own.',
  },
};

/** A title alone, with no explanation under it. */
export const TitleOnly: Story = {
  args: { title: 'Transaction failed', children: undefined },
};

/** The position screen's danger block on the `negbg` tint, with actions. */
export const TintedWithActions: Story = {
  args: {
    tinted: true,
    title: 'Close to liquidation',
    children: undefined,
  },
  render: (args) => (
    <Banner {...args}>
      Health factor 1.08. Add collateral or repay part of the loan.
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary">Add collateral</Button>
        <Button variant="secondary">Repay part</Button>
      </div>
    </Banner>
  ),
};

/** The confirm modal's banners and the position's. */
export const AllBanners: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Banner title="Transaction failed" tone="danger">
        The wallet rejected the request. Nothing was sent.
      </Banner>
      <Banner title="Taking longer than usual" tone="warning">
        The bridge is still settling. You can close this window; the loan
        finishes on its own.
      </Banner>
      <Banner tinted title="Close to liquidation" tone="danger">
        Health factor 1.08. Add collateral or repay part of the loan.
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary">Add collateral</Button>
          <Button variant="secondary">Repay part</Button>
        </div>
      </Banner>
    </div>
  ),
};
