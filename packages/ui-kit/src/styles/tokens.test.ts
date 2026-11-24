import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** A stylesheet next to this file, without its comments. */
function readCss(file: string): string {
  return readFileSync(
    fileURLToPath(new URL(file, import.meta.url)),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
}

const css = readCss('./tokens.css');

type Rule = { prelude: string; body: string };

/** The top-level rules of a stylesheet, or of an at-rule's body. */
function parseRules(source: string): Rule[] {
  const rules: Rule[] = [];
  let depth = 0;
  let preludeStart = 0;
  let bodyStart = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (char === '{') {
      if (depth === 0) {
        bodyStart = i + 1;
      }

      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        rules.push({
          prelude: source
            .slice(preludeStart, bodyStart - 1)
            .replace(/\s+/g, ' ')
            .trim(),
          body: source.slice(bodyStart, i),
        });
        preludeStart = i + 1;
      }
    }
  }

  return rules;
}

function declarations(body: string): Record<string, string> {
  return Object.fromEntries(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(':');

        return [
          declaration.slice(0, colon).trim(),
          declaration.slice(colon + 1).trim(),
        ];
      }),
  );
}

/** The merged declarations of every rule with this exact prelude. */
function block(rules: Rule[], prelude: string): Record<string, string> {
  const matching = rules.filter((rule) => rule.prelude === prelude);

  expect(matching, `no rule for "${prelude}"`).not.toHaveLength(0);

  return Object.assign({}, ...matching.map((rule) => declarations(rule.body)));
}

const rules = parseRules(css);

/** The declarations of `selector` inside `@media <media>`. */
function mediaBlock(media: string, selector: string) {
  const rule = rules.find((r) => r.prelude === `@media ${media}`);

  expect(rule, `no @media ${media}`).toBeDefined();

  return block(parseRules(rule?.body ?? ''), selector);
}

// Web-Borrow.dc.html lines 163–164.
const TOKENS: Record<string, [light: string, dark: string]> = {
  '--sf': ['#FFFFFF', '#16181D'],
  '--sf2': ['#F6F8F1', '#1F2328'],
  '--sf3': ['#FAFBF7', '#1B1E23'],
  '--hov': ['#F1F3EC', '#262A30'],
  '--tint': ['#F3F9E4', '#222B19'],
  '--track': ['#EEF1E8', '#2A2E34'],
  '--bd': ['#E3E6DD', '#2D3238'],
  '--bd2': ['#D5D9CE', '#3B4148'],
  '--mid': ['#9AA39B', '#6B737C'],
  '--mid2': ['#C4CABF', '#434950'],
  '--limebd': ['#B7DA72', '#5F7B2E'],
  '--ink': ['#111613', '#F2F4EF'],
  '--mut': ['#4A524C', '#AAB1AB'],
  '--mut2': ['#5C645E', '#8F978F'],
  '--mut3': ['#8A928C', '#7A827B'],
  '--pos': ['#3F7A0A', '#8FD14F'],
  '--neg': ['#A8321F', '#FF8A73'],
  '--warn': ['#7A4E00', '#F2C35B'],
  '--warnbd': ['#E0B54A', '#8A6A1F'],
  '--warnbg': ['#FFF7E3', '#2A2415'],
  '--negbg': ['#FDF0EC', '#2E1D1A'],
  '--onlime': ['#111613', '#111613'],
  '--badge': ['#111613', '#0B0D0F'],
};

const DARK_SELECTOR = '[data-theme="dark"]';

describe('tokens.css', () => {
  const light = block(rules, ':root');
  const dark = block(rules, DARK_SELECTOR);

  it.each(Object.entries(TOKENS))(
    '%s has the light and dark values of the artboards',
    (token, [lightValue, darkValue]) => {
      expect(light[token]).toBe(lightValue);
      expect(dark[token]).toBe(darkValue);
    },
  );

  it('defines no colour token beyond the artboards’ set and the accent', () => {
    const colourTokens = (decls: Record<string, string>) =>
      Object.keys(decls).filter((name) => decls[name]?.startsWith('#'));

    const expected = [...Object.keys(TOKENS), '--accent'].sort();

    expect(colourTokens(light).sort()).toEqual(expected);
    expect(colourTokens(dark).sort()).toEqual(Object.keys(TOKENS).sort());
  });

  it('keeps the accent the same in both themes', () => {
    expect(light['--accent']).toBe('#C9EB8A');
    expect(dark['--accent']).toBeUndefined();
  });

  it('sets color-scheme: dark on the dark block', () => {
    expect(dark['color-scheme']).toBe('dark');
  });

  it('has the desktop type scale', () => {
    expect(light).toMatchObject({
      '--h64': '64px',
      '--h56': '56px',
      '--h44': '44px',
      '--big': '44px',
    });
  });

  it('shrinks the type scale at max-width 640px', () => {
    expect(mediaBlock('(max-width: 640px)', ':root')).toEqual({
      '--h64': '38px',
      '--h56': '36px',
      '--h44': '28px',
      '--big': '32px',
    });
  });

  it('falls back to the dark block for a dark system theme before JS runs', () => {
    expect(
      mediaBlock('(prefers-color-scheme: dark)', ':root:not([data-theme])'),
    ).toEqual(dark);
  });
});

describe('theme.css', () => {
  const theme = block(parseRules(readCss('./theme.css')), '@theme inline');

  it.each([...Object.keys(TOKENS), '--accent'])(
    'exposes %s as a Tailwind colour',
    (token) => {
      expect(theme[`--color-${token.slice(2)}`]).toBe(`var(${token})`);
    },
  );

  it('sets the sans font to Schibsted Grotesk', () => {
    expect(theme['--font-sans']).toBe(
      "'Schibsted Grotesk', system-ui, sans-serif",
    );
  });

  it('maps the text sizes to the type scale', () => {
    expect(theme).toMatchObject({
      '--text-h64': 'var(--h64)',
      '--text-h56': 'var(--h56)',
      '--text-h44': 'var(--h44)',
      '--text-big': 'var(--big)',
    });
  });
});
