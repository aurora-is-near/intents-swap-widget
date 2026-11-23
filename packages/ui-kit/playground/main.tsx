import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

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

const WEIGHTS = [
  { weight: 500, className: 'font-medium' },
  { weight: 600, className: 'font-semibold' },
  { weight: 700, className: 'font-bold' },
  { weight: 800, className: 'font-extrabold' },
] as const;

/** Reads a token's computed value, so the swatch shows the hex it resolves to. */
function TokenValue({ name }: { name: string }) {
  return (
    <code
      className="text-xs text-mut2"
      ref={(element) => {
        if (element) {
          element.textContent = getComputedStyle(element)
            .getPropertyValue(`--${name}`)
            .trim();
        }
      }}
    />
  );
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

function Theme({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <section
      aria-label={`${theme} theme`}
      className="flex min-w-0 flex-1 flex-col gap-6 bg-sf p-6 font-sans text-ink"
      data-theme={theme}>
      <h2 className="m-0 text-xs font-semibold tracking-[0.14em] text-mut2 uppercase">
        {theme}
      </h2>
      <Tokens />
      <Type />
    </section>
  );
}

function Playground() {
  return (
    <main className="flex flex-wrap">
      <Theme theme="light" />
      <Theme theme="dark" />
    </main>
  );
}

// Until the ThemeProvider exists: pin the page to light, so a dark system
// theme (the pre-JS fallback in tokens.css) doesn't darken the light column.
document.documentElement.dataset.theme = 'light';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <Playground />
    </StrictMode>,
  );
}
