import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollArea } from './ScrollArea';

const ROWS = Array.from({ length: 24 }, (_, index) => `Row ${index + 1}`);

const meta = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
  args: {
    viewportClassName: 'max-h-60',
    scrollbarClassName: 'my-2 -mr-3',
  },
  render: (args) => (
    // A card with 16px of padding: the scrollbar is pulled into it.
    <div className="box-border w-72 rounded-18 border-1.5 border-solid border-bd bg-sf p-4 font-sans text-15 text-ink">
      <ScrollArea {...args}>
        <div className="flex flex-col gap-2">
          {ROWS.map((row) => (
            <div key={row} className="rounded-12 bg-sf2 px-3 py-2">
              {row}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Scroll the rows: the 3px bar appears in the card's padding, then fades. */
export const Playground: Story = {};
