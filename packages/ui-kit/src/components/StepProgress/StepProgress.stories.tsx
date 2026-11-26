import type { Meta, StoryObj } from '@storybook/react-vite';

import { StepProgress } from './StepProgress';
import type { Step } from './StepProgress';

const PENDING_STEPS: readonly Step[] = [
  { label: 'Approve WETH', status: 'done' },
  { label: 'Supply collateral', status: 'active' },
  { label: 'Borrow USDC', status: 'waiting' },
];

const FAILED_STEPS: readonly Step[] = [
  { label: 'Approve WETH', status: 'done' },
  { label: 'Supply collateral', status: 'failed' },
  { label: 'Borrow USDC', status: 'waiting' },
];

const DONE_STEPS: readonly Step[] = [
  { label: 'Approve WETH', status: 'done' },
  { label: 'Supply collateral', status: 'done' },
  { label: 'Borrow USDC', status: 'done' },
];

const meta = {
  title: 'Components/StepProgress',
  component: StepProgress,
  args: { 'aria-label': 'Loan progress', steps: PENDING_STEPS },
} satisfies Meta<typeof StepProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** One step done, one in progress (`aria-current="step"`), one waiting. */
export const Pending: Story = {};

/** A failed step turns its row `neg`; later steps stay waiting. */
export const Failed: Story = {
  args: { 'aria-label': 'Failed loan progress', steps: FAILED_STEPS },
};

export const Complete: Story = {
  args: { 'aria-label': 'Completed loan progress', steps: DONE_STEPS },
};

/** The confirm modal's steps, pending and failed. */
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
      <StepProgress aria-label="Loan progress" steps={PENDING_STEPS} />
      <StepProgress aria-label="Failed loan progress" steps={FAILED_STEPS} />
    </div>
  ),
};
