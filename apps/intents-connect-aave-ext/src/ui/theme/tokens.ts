/**
 * Every visual value of the modal, as one record. Each token is a CSS custom
 * property on the shadow host (`CSS_VARIABLES` names it), which
 * `styles.css` maps onto Tailwind's utilities. Sizes are in px, so the host
 * page's `<html>` font size can't scale the modal.
 */
export type ThemeTokens = {
  /** The dialog's background. */
  surface: string;
  /** Lists, notices and cards on the surface. */
  surfaceRaised: string;
  /** Hovered rows, skeletons, letter avatars. */
  surfaceHover: string;
  /** Inputs, pickers, secondary buttons and pills. */
  field: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Hairlines: card outlines and list separators. */
  ring: string;
  /** The dialog's outline. */
  ringStrong: string;
  /** The faint drop under cards and buttons. */
  shadowDrop: string;
  /** The dialog's drop. */
  shadowFloat: string;
  /** The backdrop behind the dialog. */
  overlay: string;
  /** Segmented controls' background. */
  track: string;
  /** The progress stepper's empty segments. */
  trackStrong: string;
  /** The outline of a focused field. */
  focus: string;
  /** Link underlines. */
  linkLine: string;
  /** The primary button. */
  cta: string;
  ctaHover: string;
  ctaDisabled: string;
  ctaText: string;
  danger: string;
  /** The warning notice's background and outline. */
  dangerBg: string;
  dangerRing: string;

  /** `light` or `dark`: native controls and scrollbars follow it. */
  scheme: string;
  /** The font stack. */
  font: string;
  /** The one weight used for emphasis. */
  weightMedium: string;
  /** Tags, the stepper: size and line height. */
  textXs: string;
  textXsLeading: string;
  /** The base text. */
  textSm: string;
  textSmLeading: string;
  /** Titles. */
  textBase: string;
  textBaseLeading: string;
  /** The primary button's label. */
  textButton: string;
  /** The amount being entered. */
  textAmount: string;

  /** The dialog's corners. */
  radiusDialog: string;
  /** Cards, lists, fields and notices. */
  radiusCard: string;
  /** Secondary buttons, search, pills, wallet icons. */
  radiusControl: string;
  /** Tags, tabs, ghost buttons. */
  radiusChip: string;
  /** The primary button. */
  radiusCta: string;

  /** The spacing unit every padding, gap and height multiplies. */
  space: string;
};

/**
 * app.aave.com's light theme, sampled from its own supply dialog, so the
 * modal reads as part of the page there.
 */
export const DEFAULT_TOKENS: ThemeTokens = {
  surface: '#fafafa',
  surfaceRaised: '#fcfcfc',
  surfaceHover: '#f0f0f0',
  field: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#666666',
  textMuted: '#7d7d7d',
  ring: 'rgba(0, 0, 0, 0.06)',
  ringStrong: 'rgba(0, 0, 0, 0.08)',
  shadowDrop: 'rgba(0, 0, 0, 0.03)',
  shadowFloat: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.32)',
  track: 'rgba(0, 0, 0, 0.05)',
  trackStrong: 'rgba(0, 0, 0, 0.08)',
  focus: 'var(--text-primary)',
  linkLine: 'rgba(0, 0, 0, 0.2)',
  cta: '#000000',
  ctaHover: '#262626',
  ctaDisabled: '#808080',
  ctaText: '#fafafa',
  danger: '#eb4200',
  dangerBg: '#fff5f0',
  dangerRing: 'rgba(235, 66, 0, 0.18)',

  scheme: 'light',
  font: "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif",
  weightMedium: '500',
  textXs: '12px',
  textXsLeading: '16px',
  textSm: '14px',
  textSmLeading: '20px',
  textBase: '16px',
  textBaseLeading: '24px',
  textButton: '15px',
  textAmount: '21px',

  radiusDialog: '12px',
  radiusCard: '12px',
  radiusControl: '8px',
  radiusChip: '6px',
  radiusCta: '10px',

  space: '4px',
};

/**
 * Each token's custom property. Sizes and radii get short names of their
 * own: Tailwind's (`--text-xs`, `--radius-*`, `--spacing`) point at them.
 */
const CSS_VARIABLES: Readonly<Record<keyof ThemeTokens, string>> = {
  surface: '--surface',
  surfaceRaised: '--surface-raised',
  surfaceHover: '--surface-hover',
  field: '--field',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  ring: '--ring',
  ringStrong: '--ring-strong',
  shadowDrop: '--shadow-drop',
  shadowFloat: '--shadow-float',
  overlay: '--overlay',
  track: '--track',
  trackStrong: '--track-strong',
  focus: '--focus',
  linkLine: '--link-line',
  cta: '--cta',
  ctaHover: '--cta-hover',
  ctaDisabled: '--cta-disabled',
  ctaText: '--cta-text',
  danger: '--danger',
  dangerBg: '--danger-bg',
  dangerRing: '--danger-ring',

  scheme: '--scheme',
  font: '--font',
  weightMedium: '--weight-medium',
  textXs: '--fs-xs',
  textXsLeading: '--lh-xs',
  textSm: '--fs-sm',
  textSmLeading: '--lh-sm',
  textBase: '--fs-base',
  textBaseLeading: '--lh-base',
  textButton: '--fs-button',
  textAmount: '--fs-amount',

  radiusDialog: '--r-dialog',
  radiusCard: '--r-card',
  radiusControl: '--r-control',
  radiusChip: '--r-chip',
  radiusCta: '--r-cta',

  space: '--space',
};

/** The defaults with `overrides` on top; unset overrides are skipped. */
export const resolveTokens = (
  overrides: Partial<ThemeTokens> = {},
): ThemeTokens => {
  const tokens = { ...DEFAULT_TOKENS };

  (Object.keys(overrides) as (keyof ThemeTokens)[]).forEach((key) => {
    const value = overrides[key];

    if (typeof value === 'string' && value.trim()) {
      tokens[key] = value;
    }
  });

  return tokens;
};

/** The tokens as a `:host` rule. */
export const themeCss = (tokens: ThemeTokens): string =>
  `:host {\n${(Object.keys(tokens) as (keyof ThemeTokens)[])
    .map((key) => `  ${CSS_VARIABLES[key]}: ${tokens[key]};`)
    .join('\n')}\n}`;
