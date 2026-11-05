import { formatColor, lightness } from '../color';
import type { ThemeSeed } from '../derive';
import { collectButtons, collectSurfaces, pageBackground } from './collect';
import { readDesignSystem } from './designSystems';
import { cardSurface, controlShape, paintedIn, pickAccent } from './heuristics';
import { toRgba } from './normalize';
import type { PageThemeHints, PageThemeReading, ThemeEvidence } from './types';

/** Generic families ending a font stack: no fallbacks needed after them. */
const GENERIC = /(sans-serif|serif|monospace|system-ui|cursive|fantasy)\s*$/i;
const FALLBACK_FONTS = 'ui-sans-serif, system-ui, sans-serif';

const PILL = 999;

/**
 * A theme seed read from the page, each value from the first source that
 * has it:
 * - the site adapter's pinned values;
 * - for the page background, text and font: what the page renders (its
 *   design system's "default background" isn't always what's painted);
 * - for surfaces, the accent, secondary text and danger: its design
 *   system's variables (MUI, shadcn, Radix, Mantine, Bootstrap), then
 *   measured components;
 * - radii and density: always measured buttons and cards.
 *
 * Synchronous and read-only; it never throws for a page it can't read,
 * leaving those fields unset.
 */
export const readPageTheme = (
  doc: Document = document,
  hints: PageThemeHints = {},
): PageThemeReading => {
  const seed: Partial<ThemeSeed> = {};
  const evidence: ThemeEvidence = {};

  const set = <K extends keyof ThemeSeed>(
    key: K,
    value: ThemeSeed[K] | undefined,
    source: string,
  ) => {
    if (value !== undefined && seed[key] === undefined) {
      seed[key] = value;
      evidence[key] = source;
    }
  };

  (Object.keys(hints.pin ?? {}) as (keyof ThemeSeed)[]).forEach((key) => {
    set(key, hints.pin![key], 'hint');
  });

  const body = doc.body ? getComputedStyle(doc.body) : undefined;
  const surfaces = collectSurfaces(doc, hints);
  const buttons = collectButtons(doc, hints);
  const appRoot = doc.querySelector('#__next, #root, #app');
  const system = readDesignSystem(
    (name) =>
      [appRoot, doc.body, doc.documentElement]
        .map((element) =>
          element
            ? getComputedStyle(element).getPropertyValue(name).trim()
            : '',
        )
        .find(Boolean) ?? '',
  );

  const fromSystem = system?.values ?? {};

  // The page and its text, as rendered.
  const page = pageBackground(doc, surfaces.backdrop);

  set('page', page && formatColor(page.color), page?.source ?? '');
  set('page', fromSystem.page, system?.id ?? '');
  const bodyText = body && toRgba(body.color);

  set('text', bodyText && formatColor(bodyText), 'computed:body');
  set('text', fromSystem.text, system?.id ?? '');

  if (body) {
    const family = body.fontFamily.trim();

    set(
      'font',
      family &&
        (GENERIC.test(family) ? family : `${family}, ${FALLBACK_FONTS}`),
      'computed:body',
    );
    set(
      'fontSize',
      Number.parseFloat(body.fontSize) || undefined,
      'computed:body',
    );
  }

  // The scheme follows the page's background.
  const pageColor = toRgba(seed.page);

  set(
    'scheme',
    pageColor && (lightness(pageColor) < 0.5 ? 'dark' : 'light'),
    `computed:${evidence.page ?? 'page'}`,
  );

  // Surfaces: the design system's, else the cards on the page.
  const cards = pageColor ? cardSurface(surfaces.cards, pageColor) : undefined;

  set('surface', fromSystem.surface, system?.id ?? '');
  set(
    'surface',
    cards && formatColor(cards.fill),
    `computed:cards(${cards?.count})`,
  );
  set('cardRadius', cards?.radius, `computed:cards(${cards?.count})`);

  // The accent: the design system's primary, else the page's primary button.
  const grounds = [pageColor, toRgba(seed.surface)].filter(
    (color): color is NonNullable<typeof color> => !!color,
  );

  set('accent', fromSystem.accent, system?.id ?? '');
  set('accentText', fromSystem.accentText, system?.id ?? '');

  if (seed.accent === undefined) {
    const picked = pickAccent(buttons, grounds);

    set(
      'accent',
      picked && formatColor(picked.fill),
      `computed:buttons(${picked?.count})`,
    );
  }

  // How the page writes on its accent: the buttons painted in it.
  const accentColor = toRgba(seed.accent);
  const painted = accentColor && paintedIn(buttons, accentColor);
  const paintedSource = `computed:buttons(${painted?.count})`;

  set('accentText', painted && formatColor(painted.text), paintedSource);
  set('fontWeight', painted?.weight, paintedSource);

  set('textSecondary', fromSystem.textSecondary, system?.id ?? '');
  set('danger', fromSystem.danger, system?.id ?? '');

  // Shapes and density: measured.
  const shape = controlShape(buttons);

  set(
    'controlRadius',
    shape && (shape.radius === PILL ? 24 : Math.round(shape.radius)),
    `computed:buttons(${shape?.count})`,
  );
  set(
    'density',
    shape && Math.round(shape.density * 100) / 100,
    `computed:buttons(${shape?.count})`,
  );

  return { seed, evidence, system: system?.id };
};

export type { PageThemeHints, PageThemeReading } from './types';
