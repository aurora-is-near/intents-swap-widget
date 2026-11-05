import { contrast, parseColor } from '../color';
import { MIN_CONTRAST } from '../derive';
import type { ThemeTokens } from '../tokens';

/** A text token's WCAG contrast on each of its grounds. */
type ContrastCheck = {
  label: string;
  fg: keyof ThemeTokens;
  on: readonly (keyof ThemeTokens)[];
  /** What derivation holds it to. */
  min: number;
  ratios: number[];
};

const GROUNDS = ['surface', 'field'] as const;

const CHECKS = [
  {
    label: 'Text',
    fg: 'textPrimary',
    on: [...GROUNDS, 'control'],
    min: MIN_CONTRAST.text,
  },
  {
    label: 'Secondary',
    fg: 'textSecondary',
    on: GROUNDS,
    min: MIN_CONTRAST.secondary,
  },
  { label: 'Muted', fg: 'textMuted', on: GROUNDS, min: MIN_CONTRAST.muted },
  { label: 'Danger', fg: 'danger', on: GROUNDS, min: MIN_CONTRAST.danger },
  {
    label: 'CTA text',
    fg: 'ctaText',
    on: ['cta'],
    min: MIN_CONTRAST.ownCtaText,
  },
  {
    label: 'CTA, disabled',
    fg: 'ctaText',
    on: ['ctaDisabled'],
    min: MIN_CONTRAST.ctaDisabledText,
  },
] as const satisfies readonly Omit<ContrastCheck, 'ratios'>[];

/**
 * Each text token's contrast on the grounds it's drawn on, with the minimum
 * derivation holds it to. A pair with a token that isn't a plain color (an
 * exact `var(…)` override) is left out.
 */
export const contrastChecks = (tokens: ThemeTokens): ContrastCheck[] =>
  CHECKS.flatMap((check) => {
    const fg = parseColor(tokens[check.fg]);
    const grounds = check.on.map((key) => parseColor(tokens[key]));

    if (!fg || grounds.some((ground) => !ground)) {
      return [];
    }

    return [
      { ...check, ratios: grounds.map((ground) => contrast(fg, ground!)) },
    ];
  });
