import type { Meta, StoryObj } from '@storybook/react-vite';

import { TokenMark } from './TokenMark';

/**
 * Sample marks, from the artboard's script data (`EX`). The real palette is
 * app data, not the kit's.
 */
const MARKS = [
  { label: 'BT', bg: '#FFE2A8', fg: '#4A3000' },
  { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
  { label: 'US', bg: '#D3F2DF', fg: '#0C4325' },
  { label: 'UC', bg: '#C7E0FF', fg: '#0B2E5C' },
] as const;

/** A self-contained logo, so the story needs no network. */
const LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 38 38'%3E%3Crect width='38' height='38' fill='%232E6BFF'/%3E%3Ccircle cx='19' cy='19' r='10' fill='%23fff'/%3E%3C/svg%3E";

const meta = {
  title: 'Components/TokenMark',
  component: TokenMark,
  args: { label: 'ET', bg: '#DAD9F7', fg: '#25235C', size: 38 },
  argTypes: {
    bg: { control: 'color' },
    fg: { control: 'color' },
    size: { control: { type: 'number', min: 16, max: 96, step: 1 } },
    src: { control: 'text' },
  },
} satisfies Meta<typeof TokenMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 38px on the picker's trigger, 34px in a token row. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <TokenMark {...args} size={38} />
      <TokenMark {...args} className="text-13" size={34} />
      <TokenMark {...args} className="text-10" size={24} />
    </div>
  ),
};

/** `src` shows a logo in place of the letters; `alt` defaults to `label`. */
export const WithLogo: Story = {
  args: { label: 'BA', src: LOGO, alt: 'Base' },
};

/** The sample marks. */
export const AllMarks: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {MARKS.map((mark) => (
        <TokenMark key={mark.label} {...mark} />
      ))}
    </div>
  ),
};
