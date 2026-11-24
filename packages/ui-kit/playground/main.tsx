import './styles.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, useTheme } from '../src';
import type { ThemePreference } from '../src';

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
  { name: 'h56', className: 'text-h56 font-extrabold' },
  { name: 'h44', className: 'text-h44 font-extrabold' },
  { name: 'big', className: 'text-big font-semibold' },
] as const;

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const WEIGHTS = [
  { weight: 500, className: 'font-medium' },
  { weight: 600, className: 'font-semibold' },
  { weight: 700, className: 'font-bold' },
  { weight: 800, className: 'font-extrabold' },
] as const;

/**
 * Reads a token's computed value, so the swatch shows the hex it resolves to.
 * A passive effect, because it runs after ThemeProvider's layout effect has
 * written the new data-theme (a ref or child layout effect runs before it).
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

function Tokens() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0">
      {TOKENS.map(({ name, className }) => (
        <li className="flex flex-col gap-1" key={name}>
          <div
            className={`h-14 rounded-xl border-[1.5px] border-bd ${className}`}
          />
          <span className="text-sm font-bold">--{name}</span>
          <TokenValue name={name} />
        </li>
      ))}
    </ul>
  );
}

function Type() {
  return (
    <div className="flex flex-col gap-2">
      {TYPE_SCALE.map(({ name, className }) => (
        <p className={`m-0 leading-[1.05] ${className}`} key={name}>
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

/** System / light / dark, as a radio group so it works from the keyboard. */
function ThemeSwitch() {
  const { preference, theme, setPreference } = useTheme();

  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
      <legend className="sr-only">Theme</legend>
      {PREFERENCES.map((option) => (
        <label
          className="cursor-pointer rounded-full border-[1.5px] border-bd2 bg-sf px-[18px] py-[9px] text-[15px] font-bold capitalize hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-sf has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-ink has-focus-visible:outline-solid"
          key={option}>
          <input
            checked={preference === option}
            className="sr-only"
            name="theme"
            onChange={() => setPreference(option)}
            type="radio"
            value={option}
          />
          {option}
        </label>
      ))}
      <span className="text-sm text-mut2">Resolved: {theme}</span>
    </fieldset>
  );
}

function Playground() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-sf p-6 font-sans text-ink">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-xs font-semibold tracking-[0.14em] text-mut2 uppercase">
          UI kit playground
        </h1>
        <ThemeSwitch />
      </header>
      <Tokens />
      <Type />
    </main>
  );
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <Playground />
      </ThemeProvider>
    </StrictMode>,
  );
}
