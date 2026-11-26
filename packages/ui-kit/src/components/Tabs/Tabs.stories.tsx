import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tab, Tabs, TabsList, TabsPanel } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  subcomponents: { TabsList, Tab, TabsPanel },
  args: { defaultValue: 'new' },
  argTypes: {
    defaultValue: {
      control: 'inline-radio',
      options: ['new', 'positions'],
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Borrow's two views; `children` adds more tabs after them. */
function BorrowViewsList({ children }: { children?: ReactNode }) {
  return (
    <TabsList aria-label="Borrow views">
      <Tab value="new">New loan</Tab>
      <Tab count={2} value="positions">
        My positions
      </Tab>
      {children}
    </TabsList>
  );
}

function BorrowViewsPanels() {
  return (
    <>
      <TabsPanel className="mt-5 text-mut" value="new">
        New loan form
      </TabsPanel>
      <TabsPanel className="mt-5 text-mut" value="positions">
        Two open positions
      </TabsPanel>
    </>
  );
}

/** A vault's actions, with withdrawing disabled. */
function VaultActionList() {
  return (
    <TabsList aria-label="Vault action">
      <Tab value="deposit">Deposit</Tab>
      <Tab disabled value="withdraw">
        Withdraw
      </Tab>
    </TabsList>
  );
}

export const Playground: Story = {
  render: (args) => (
    <Tabs {...args}>
      <BorrowViewsList />
      <BorrowViewsPanels />
    </Tabs>
  ),
};

/** `count` adds a badge after the label; it is part of the tab's name. */
export const WithCount: Story = {
  args: { defaultValue: 'positions' },
  render: (args) => (
    <Tabs {...args}>
      <BorrowViewsList />
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  args: { defaultValue: 'deposit' },
  render: (args) => (
    <Tabs {...args}>
      <VaultActionList />
    </Tabs>
  ),
};

function ControlledTabs() {
  const [view, setView] = useState('new');

  return (
    <Tabs onValueChange={(value: string) => setView(value)} value={view}>
      <BorrowViewsList />
      <p className="mt-5 mb-0 text-sm text-mut2">Active tab: {view}</p>
    </Tabs>
  );
}

/** Controlled with `value` and `onValueChange`. */
export const Controlled: Story = {
  render: () => <ControlledTabs />,
};

/** Both tab rows. */
export const AllTabs: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="new">
        <BorrowViewsList />
        <BorrowViewsPanels />
      </Tabs>
      <Tabs defaultValue="deposit">
        <VaultActionList />
      </Tabs>
    </div>
  ),
};
