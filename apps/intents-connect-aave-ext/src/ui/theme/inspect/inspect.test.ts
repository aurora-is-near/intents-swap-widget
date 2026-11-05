import { describe, expect, it } from 'vitest';

import { DEFAULT_TOKENS } from '../tokens';
import { withEdits } from './bridge';
import { contrastChecks } from './checks';
import { themeConfig } from './config';
import { seedSource } from './fields';
import { inspectorStore } from './store';

const AAVE = {
  auto: { selectors: { card: '.MuiPaper-root' }, pin: { cardRadius: 12 } },
};

describe('themeConfig', () => {
  it('pins edits for the page reader, keeping the hints', () => {
    expect(themeConfig(AAVE, { accent: '#2563eb', density: 0.9 })).toEqual({
      auto: {
        selectors: { card: '.MuiPaper-root' },
        pin: { cardRadius: 12, accent: '#2563eb', density: 0.9 },
      },
    });
  });

  it("edits the theme's own seed where it sets the value", () => {
    expect(
      themeConfig(
        { seed: { accent: '#000000' }, tokens: { radiusCta: '0px' } },
        { accent: '#2563eb', fontSize: 15 },
      ),
    ).toEqual({
      auto: { pin: { fontSize: 15 } },
      seed: { accent: '#2563eb' },
      tokens: { radiusCta: '0px' },
    });
  });

  it("puts every edit in the seed when the theme doesn't read the page", () => {
    expect(themeConfig({ auto: false }, { accent: '#2563eb' })).toEqual({
      auto: false,
      seed: { accent: '#2563eb' },
    });
  });

  it('is the theme as it is without edits', () => {
    expect(themeConfig(AAVE, {})).toEqual(AAVE);
    expect(themeConfig(undefined, {})).toEqual({});
  });
});

describe('contrastChecks', () => {
  it("measures Aave's tokens, which pass every minimum", () => {
    const checks = contrastChecks(DEFAULT_TOKENS);

    expect(checks.map((check) => check.label)).toEqual([
      'Text',
      'Secondary',
      'Muted',
      'Danger',
      'CTA text',
      'CTA, disabled',
    ]);

    checks.forEach((check) =>
      check.ratios.forEach((ratio) =>
        expect([check.label, ratio >= check.min]).toEqual([check.label, true]),
      ),
    );

    // Black on Aave's off-white dialog.
    expect(checks[0]!.ratios[0]).toBeCloseTo(20.1, 1);
  });

  it("skips a pair it can't measure", () => {
    const checks = contrastChecks({
      ...DEFAULT_TOKENS,
      textMuted: 'var(--brand-muted)',
    });

    expect(checks.map((check) => check.label)).not.toContain('Muted');
  });
});

describe('seedSource', () => {
  const inspected = {
    theme: { seed: { fontSize: 15 } },
    reading: { seed: { accent: '#000000' }, evidence: { accent: 'mui' } },
  };

  it('names an edit, the theme, the reader, a derived value or the default', () => {
    expect(seedSource('accent', inspected, { accent: '#fff' }, '#fff')).toBe(
      'edit',
    );
    expect(seedSource('fontSize', inspected, {}, 15)).toBe('theme.seed');
    expect(seedSource('accent', inspected, {}, '#000000')).toBe('mui');
    expect(seedSource('textSecondary', inspected, {}, undefined)).toBe(
      'derived',
    );
    expect(seedSource('danger', inspected, {}, '#eb4200')).toBe('default');
  });
});

describe('inspectorStore', () => {
  it('edits one value at a time, and gives it back', () => {
    const seen: unknown[] = [];
    const unsubscribe = inspectorStore.subscribe(() =>
      seen.push(inspectorStore.edits()),
    );

    inspectorStore.edit('accent', '#2563eb');
    inspectorStore.edit('density', 0.9);
    inspectorStore.edit('accent', undefined);

    expect(inspectorStore.edits()).toEqual({ density: 0.9 });
    expect(seen).toHaveLength(3);

    inspectorStore.reset();
    unsubscribe();

    expect(inspectorStore.edits()).toEqual({});
  });

  it('applies edits as the copied config would', () => {
    expect(withEdits(AAVE, { page: '#101014' })).toEqual(
      themeConfig(AAVE, { page: '#101014' }),
    );
    expect(withEdits({ seed: { accent: '#000' } }, { accent: '#fff' })).toEqual(
      { seed: { accent: '#fff' } },
    );
    expect(withEdits(AAVE, {})).toBe(AAVE);
  });
});
