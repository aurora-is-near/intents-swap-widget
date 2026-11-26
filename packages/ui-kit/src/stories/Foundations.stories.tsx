import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { useTheme } from '../theme/ThemeProvider';

/*
 * The design tokens and type, from the kit's stylesheet (styles/tokens.css,
 * styles/theme.css). Switch the theme from the toolbar: every swatch reads
 * the value its token resolves to in that theme.
 */

// Class names are spelled out so Tailwind finds them in this file.
const TOKENS = [
  { name: 'sf', className: 'bg-sf' },
  { name: 'sf2', className: 'bg-sf2' },
  { name: 'sf3', className: 'bg-sf3' },
  { name: 'hov', className: 'bg-hov' },
  { name: 'tint', className: 'bg-tint' },
  { name: 'track', className: 'bg-track' },
  { name: 'bd', className: 'bg-bd' },
  { name: 'bd2', className: 'bg-bd2' },
  { name: 'mid', className: 'bg-mid' },
  { name: 'mid2', className: 'bg-mid2' },
  { name: 'limebd', className: 'bg-limebd' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'mut', className: 'bg-mut' },
  { name: 'mut2', className: 'bg-mut2' },
  { name: 'mut3', className: 'bg-mut3' },
  { name: 'pos', className: 'bg-pos' },
  { name: 'neg', className: 'bg-neg' },
  { name: 'warn', className: 'bg-warn' },
  { name: 'warnbd', className: 'bg-warnbd' },
  { name: 'warnbg', className: 'bg-warnbg' },
  { name: 'negbg', className: 'bg-negbg' },
  { name: 'onlime', className: 'bg-onlime' },
  { name: 'badge', className: 'bg-badge' },
  { name: 'accent', className: 'bg-accent' },
] as const;

const TYPE_SCALE = [
  { name: 'h64', className: 'text-h64 font-extrabold' },
] as const;

// The artboard scale (theme.css), spelled out so Tailwind finds the classes.
const TEXT_SIZES = [
  { px: 10, className: 'text-10' },
  { px: 11, className: 'text-11' },
  { px: 12, className: 'text-12' },
  { px: 13, className: 'text-13' },
  { px: 14, className: 'text-14' },
  { px: 15, className: 'text-15' },
  { px: 16, className: 'text-16' },
  { px: 17, className: 'text-17' },
  { px: 18, className: 'text-18' },
  { px: 19, className: 'text-19' },
  { px: 24, className: 'text-24' },
  { px: 26, className: 'text-26' },
  { px: 28, className: 'text-28' },
  { px: 30, className: 'text-30' },
  { px: 34, className: 'text-34' },
] as const;

const RADII = [
  { px: 2, className: 'rounded-2' },
  { px: 5, className: 'rounded-5' },
  { px: 7, className: 'rounded-7' },
  { px: 8, className: 'rounded-8' },
  { px: 12, className: 'rounded-12' },
  { px: 14, className: 'rounded-14' },
  { px: 16, className: 'rounded-16' },
  { px: 18, className: 'rounded-18' },
  { px: 24, className: 'rounded-24' },
  { px: 28, className: 'rounded-28' },
] as const;

const WEIGHTS = [
  { weight: 500, className: 'font-medium' },
  { weight: 600, className: 'font-semibold' },
  { weight: 700, className: 'font-bold' },
  { weight: 800, className: 'font-extrabold' },
] as const;

/**
 * A token's computed value, so the swatch shows the hex it resolves to. A
 * passive effect: it runs after ThemeProvider has written the new theme.
 */
function TokenValue({ name }: { name: string }) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--${name}`)
        .trim(),
    );
  }, [name, theme]);

  return <code className="text-xs text-mut2">{value}</code>;
}

function Colors() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0">
      {TOKENS.map(({ name, className }) => (
        <li className="flex flex-col gap-1" key={name}>
          <div
            className={`h-14 rounded-xl border-1.5 border-bd ${className}`}
          />
          <span className="text-sm font-bold">--{name}</span>
          <TokenValue name={name} />
        </li>
      ))}
    </ul>
  );
}

function Typography() {
  return (
    <div className="flex flex-col gap-2">
      {TYPE_SCALE.map(({ name, className }) => (
        <p className={`m-0 leading-1.02 ${className}`} key={name}>
          {name}: Borrow
        </p>
      ))}
      <p className="m-0 flex flex-wrap gap-4 text-lg">
        {WEIGHTS.map(({ weight, className }) => (
          <span className={className} key={weight}>
            Schibsted {weight}
          </span>
        ))}
      </p>
    </div>
  );
}

function ScaleSamples() {
  return (
    <div className="flex flex-col gap-8">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {TEXT_SIZES.map(({ px, className }) => (
          <li className="flex items-baseline gap-4" key={px}>
            <code className="w-16 shrink-0 text-xs text-mut2">text-{px}</code>
            <span className={className}>Borrow USDC against WETH</span>
          </li>
        ))}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
        {RADII.map(({ px, className }) => (
          <li className="flex flex-col items-center gap-1" key={px}>
            <div
              className={`size-16 border-1.5 border-solid border-ink bg-tint ${className}`}
            />
            <code className="text-xs text-mut2">rounded-{px}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

const meta = {
  title: 'Design system/Foundations',
  tags: ['!autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The colour tokens, as `bg-*` / `text-*` / `border-*` utilities. */
export const ColorTokens: Story = { render: () => <Colors /> };

/** The display sizes and Schibsted Grotesk's weights. */
export const Type: Story = { render: () => <Typography /> };

/**
 * The artboards' font sizes and corner radii, named by their pixel value.
 * Spacing uses Tailwind's 4px grid (`gap-1.5` is 6px).
 */
export const Scale: Story = { render: () => <ScaleSamples /> };
