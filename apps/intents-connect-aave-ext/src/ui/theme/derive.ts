import {
  BLACK,
  composite,
  contrast,
  ensureContrast,
  formatColor,
  lightness,
  mix,
  parseColor,
  readableOn,
  type Rgba,
  WHITE,
  withAlpha,
} from './color';
import { DEFAULT_TOKENS, type ThemeTokens } from './tokens';

/**
 * The few choices a theme is derived from: what a host page shows of its
 * own look. `deriveTokens` builds every token from them.
 */
export type ThemeSeed = {
  scheme: 'light' | 'dark';
  /** The font stack. */
  font: string;
  /** Base text size in px (kept to 13–16). */
  fontSize: number;
  /**
   * The emphasis weight (kept to 500–700): titles and amounts set in it
   * stand out from 400 body text, even on a site whose buttons are 400.
   */
  fontWeight: number;
  /** The page's background: the dialog takes it. */
  page: string;
  /** Cards and inputs on the page: fields take it. */
  surface: string;
  text: string;
  /** Mixed from `text` when unset. */
  textSecondary?: string;
  /** The primary button. */
  accent: string;
  /** Kept when it reads on `accent`; black or white otherwise. */
  accentText?: string;
  danger: string;
  /** Buttons' corner radius in px (kept to 0–24). */
  controlRadius: number;
  /** Cards' corner radius in px (kept to 0–28). */
  cardRadius: number;
  /** Spacing, as a multiple of a 4 px unit (kept to 0.85–1.2). */
  density: number;
};

/** app.aave.com's light theme: derives `DEFAULT_TOKENS` (a test pins it). */
export const DEFAULT_SEED: ThemeSeed = {
  scheme: 'light',
  font: DEFAULT_TOKENS.font,
  fontSize: 14,
  fontWeight: 500,
  page: '#fafafa',
  surface: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  accent: '#000000',
  accentText: '#fafafa',
  danger: '#eb4200',
  controlRadius: 8,
  cardRadius: 12,
  density: 1,
};

/** Minimum WCAG contrast against the dialog and its fields. */
const MIN_CONTRAST = {
  /**
   * The site's own text on its own accent, already on its page: kept from
   * 3:1, as white on a mid-tone brand color usually is.
   */
  ownCtaText: 3,
  text: 7,
  secondary: 4.5,
  /** Hints and labels next to stronger text. */
  muted: 3,
  /** Status color; Aave's own error red sits at 3.6. */
  danger: 3,
  cta: 4.5,
  /**
   * The CTA's text on its disabled fill: it still says what's missing
   * ("Enter an amount"). Aave's gray sits at 3.8.
   */
  ctaDisabledText: 3,
} as const;

/** How far each shade moves, in OKLab. Tuned on Aave's sampled theme. */
const MIX = {
  /** Raised boxes: from the dialog toward the field. */
  raised: 0.4,
  /** Hovered rows: from the dialog toward the text (a dark one needs more). */
  hover: { light: 0.03, dark: 0.07 },
  /** Secondary text, when the page has none: text toward the dialog. */
  secondary: 0.4,
  /** Muted text: text toward the dialog. */
  muted: 0.6,
  /** A dark CTA lightens on hover, toward its text… */
  ctaHoverLighten: 0.27,
  /** …and any other darkens. */
  ctaHoverDarken: 0.12,
  /** The disabled CTA fades toward the dialog. */
  ctaDisabled: 0.61,
  /** The warning notice: a tint of the danger color. */
  dangerBg: { light: 0.06, dark: 0.16 },
} as const;

/** Hairlines, tracks and shadows: alphas of the text color (or black). */
const ALPHA = {
  light: {
    ring: 0.06,
    ringStrong: 0.08,
    track: 0.05,
    trackStrong: 0.08,
    linkLine: 0.2,
    shadowDrop: 0.03,
    shadowFloat: 0.05,
    overlay: 0.32,
    dangerRing: 0.18,
  },
  dark: {
    ring: 0.1,
    ringStrong: 0.14,
    track: 0.08,
    trackStrong: 0.12,
    linkLine: 0.3,
    shadowDrop: 0.3,
    shadowFloat: 0.45,
    overlay: 0.6,
    dangerRing: 0.35,
  },
} as const;

/** Below this OKLab lightness a CTA counts as dark. */
const DARK_CTA = 0.3;

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const px = (value: number) => `${Math.round(value * 100) / 100}px`;

/** A seed color, or the default's when it doesn't parse. */
const colorOf = (value: string | undefined, fallback: string): Rgba =>
  parseColor(value ?? '') ?? parseColor(fallback)!;

/** A background, made opaque over the scheme's base. */
const opaque = (color: Rgba, scheme: ThemeSeed['scheme']): Rgba =>
  color.a < 1 ? composite(color, scheme === 'dark' ? BLACK : WHITE) : color;

/**
 * Fields paired with another: a new `accent` doesn't keep Aave's text on
 * it, nor a new `text` Aave's secondary shade. They're derived instead.
 */
const PAIRED: Partial<Record<keyof ThemeSeed, keyof ThemeSeed>> = {
  accent: 'accentText',
  text: 'textSecondary',
};

const isSet = (value: unknown) => value !== undefined && value !== '';

/** `partial` over the defaults, skipping unset fields. */
export const completeSeed = (partial: Partial<ThemeSeed> = {}): ThemeSeed => {
  const seed = { ...DEFAULT_SEED };

  (Object.keys(PAIRED) as (keyof ThemeSeed)[]).forEach((key) => {
    const pair = PAIRED[key]!;

    if (isSet(partial[key]) && !isSet(partial[pair])) {
      Object.assign(seed, { [pair]: undefined });
    }
  });

  (Object.keys(partial) as (keyof ThemeSeed)[]).forEach((key) => {
    if (isSet(partial[key])) {
      Object.assign(seed, { [key]: partial[key] });
    }
  });

  return seed;
};

/**
 * Every token from a seed: shades are OKLab mixes, hairlines and shadows
 * alphas, and every text color is held to a minimum contrast against the
 * dialog and its fields (moved in lightness until it reads). Out-of-range
 * sizes are clamped, and colors that don't parse fall back to the default
 * seed's.
 */
export const deriveTokens = (seed: ThemeSeed): ThemeTokens => {
  const scheme = seed.scheme === 'dark' ? 'dark' : 'light';
  const alpha = ALPHA[scheme];

  const surface = opaque(colorOf(seed.page, DEFAULT_SEED.page), scheme);
  const field = opaque(colorOf(seed.surface, DEFAULT_SEED.surface), scheme);
  const grounds = [surface, field];

  const text = ensureContrast(
    colorOf(seed.text, DEFAULT_SEED.text),
    grounds,
    MIN_CONTRAST.text,
  );

  const secondary = ensureContrast(
    seed.textSecondary
      ? colorOf(seed.textSecondary, DEFAULT_SEED.text)
      : mix(text, surface, MIX.secondary),
    grounds,
    MIN_CONTRAST.secondary,
  );

  const muted = ensureContrast(
    mix(text, surface, MIX.muted),
    grounds,
    MIN_CONTRAST.muted,
  );

  const cta = opaque(colorOf(seed.accent, DEFAULT_SEED.accent), scheme);
  const ownCtaText = parseColor(seed.accentText ?? '');
  const ctaText =
    ownCtaText && contrast(ownCtaText, cta) >= MIN_CONTRAST.ownCtaText
      ? ownCtaText
      : readableOn(cta);

  const ctaHover =
    lightness(cta) < DARK_CTA
      ? mix(cta, ctaText, MIX.ctaHoverLighten)
      : mix(cta, BLACK, MIX.ctaHoverDarken);

  const danger = ensureContrast(
    colorOf(seed.danger, DEFAULT_SEED.danger),
    grounds,
    MIN_CONTRAST.danger,
  );

  const controlRadius = clamp(seed.controlRadius, 0, 24);
  const cardRadius = clamp(seed.cardRadius, 0, 28);
  const base = Math.round(clamp(seed.fontSize, 13, 16));

  return {
    surface: formatColor(surface),
    surfaceRaised: formatColor(mix(surface, field, MIX.raised)),
    surfaceHover: formatColor(mix(surface, text, MIX.hover[scheme])),
    field: formatColor(field),
    textPrimary: formatColor(text),
    textSecondary: formatColor(secondary),
    textMuted: formatColor(muted),
    ring: formatColor(withAlpha(text, alpha.ring)),
    ringStrong: formatColor(withAlpha(text, alpha.ringStrong)),
    shadowDrop: formatColor(withAlpha(BLACK, alpha.shadowDrop)),
    shadowFloat: formatColor(withAlpha(BLACK, alpha.shadowFloat)),
    overlay: formatColor(withAlpha(BLACK, alpha.overlay)),
    track: formatColor(withAlpha(text, alpha.track)),
    trackStrong: formatColor(withAlpha(text, alpha.trackStrong)),
    focus: 'var(--text-primary)',
    linkLine: formatColor(withAlpha(text, alpha.linkLine)),
    cta: formatColor(cta),
    ctaHover: formatColor(ctaHover),
    ctaDisabled: formatColor(
      ensureContrast(
        mix(cta, surface, MIX.ctaDisabled),
        [ctaText],
        MIN_CONTRAST.ctaDisabledText,
      ),
    ),
    ctaText: formatColor(ctaText),
    danger: formatColor(danger),
    dangerBg: formatColor(
      mix(scheme === 'light' ? field : surface, danger, MIX.dangerBg[scheme]),
    ),
    dangerRing: formatColor(withAlpha(danger, alpha.dangerRing)),

    scheme,
    font: seed.font.trim() || DEFAULT_TOKENS.font,
    weightMedium: String(
      clamp(Math.round(seed.fontWeight / 100) * 100, 500, 700),
    ),
    textXs: px(base - 2),
    textXsLeading: px(base + 2),
    textSm: px(base),
    textSmLeading: px(base + 6),
    textBase: px(base + 2),
    textBaseLeading: px(Math.round((base + 2) * 1.5)),
    textButton: px(base + 1),
    textAmount: px(Math.round(base * 1.5)),

    radiusDialog: px(cardRadius),
    radiusCard: px(cardRadius),
    radiusControl: px(controlRadius),
    radiusChip: px(Math.round(controlRadius * 0.75)),
    radiusCta: px(Math.min(28, Math.round(controlRadius * 1.25))),

    space: px(4 * clamp(seed.density, 0.85, 1.2)),
  };
};
