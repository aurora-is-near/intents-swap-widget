import { BLACK, type Rgba } from '../color';
import type { ButtonSample, CardSample } from './heuristics';
import { toRgba } from './normalize';
import type { PageThemeHints } from './types';

/** Our own UI on the page (the modal's host, injected buttons): never read. */
const OURS = '[data-aurora-intents]';

const BUTTONS =
  'button, [role="button"], input[type="submit"], input[type="button"], a[class*="btn" i], a[class*="button" i]';

const PRIMARYISH = /primary|cta|main|submit|connect|confirm|accent/i;
/** The first color in a `background-image` gradient. */
const COLOR_IN =
  /(rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}\b)/i;

const MAX_BUTTONS = 400;
const MAX_HINTED = 50;
/** Points sampled across the viewport for surfaces, per side. */
const GRID = 6;

const px = (value: string) => Number.parseFloat(value) || 0;

type Measured = { rect: DOMRect; style: CSSStyleDeclaration };

/** Its box and style, if it's ours to read and shows in the viewport. */
const measure = (element: Element): Measured | undefined => {
  if (element.closest(OURS)) {
    return undefined;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width < 1 ||
    rect.height < 1 ||
    rect.bottom < 0 ||
    rect.right < 0 ||
    rect.top > window.innerHeight ||
    rect.left > window.innerWidth
  ) {
    return undefined;
  }

  const style = getComputedStyle(element);

  return style.visibility === 'hidden' || Number(style.opacity) === 0
    ? undefined
    : { rect, style };
};

/** Its fill: the background color, else a gradient's first stop. */
const fillOf = (style: CSSStyleDeclaration): Rgba | undefined => {
  const background = toRgba(style.backgroundColor);

  if (background && background.a > 0) {
    return background;
  }

  const stop = COLOR_IN.exec(style.backgroundImage)?.[1];

  return stop ? toRgba(stop) : undefined;
};

/** The top-left corner radius in px, capped at half the height (a pill). */
const radiusOf = ({ rect, style }: Measured) => {
  const corner = style.borderTopLeftRadius;
  const value = corner.endsWith('%')
    ? (px(corner) / 100) * rect.height
    : px(corner);

  return Math.min(value, rect.height / 2);
};

/** The page's buttons that show, with their fill, shape and type. */
export const collectButtons = (
  doc: Document,
  hints: PageThemeHints,
): ButtonSample[] => {
  const { primaryButton, button } = hints.selectors ?? {};
  const hinted = new Set(
    primaryButton ? [...doc.querySelectorAll(primaryButton)] : [],
  );

  const selector = [BUTTONS, button, primaryButton].filter(Boolean).join(', ');
  const samples: ButtonSample[] = [];

  [...doc.querySelectorAll(selector)]
    .slice(0, MAX_BUTTONS)
    .forEach((element) => {
      if (
        (element as HTMLButtonElement).disabled ||
        element.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      const measured = measure(element);

      if (!measured) {
        return;
      }

      const { rect, style } = measured;
      const fill = fillOf(style);
      const border =
        px(style.borderTopWidth) > 0 &&
        (toRgba(style.borderTopColor)?.a ?? 0) > 0;

      samples.push({
        fill,
        text: toRgba(style.color) ?? BLACK,
        radius: radiusOf(measured),
        height: rect.height,
        width: rect.width,
        weight: Number(style.fontWeight) || 400,
        boxed: !!fill || border || style.boxShadow !== 'none',
        primaryish: PRIMARYISH.test(
          [
            element.getAttribute('class'),
            element.getAttribute('type'),
            element.getAttribute('data-variant'),
          ].join(' '),
        ),
        hinted: hinted.has(element),
      });
    });

  return samples;
};

/**
 * Filled boxes across the viewport, sampled on a grid: cards and panels
 * (1–80% of the viewport), and backdrops (over half of it) for a page that
 * paints its background on a wrapper rather than the body.
 */
export const collectSurfaces = (
  doc: Document,
  hints: PageThemeHints,
): { cards: CardSample[]; backdrop?: Rgba } => {
  const viewport = window.innerWidth * window.innerHeight;
  const seen = new Set<Element>();
  const cards: CardSample[] = [];
  let backdrop: { fill: Rgba; area: number } | undefined;

  const consider = (element: Element, weight = 1) => {
    if (
      seen.has(element) ||
      element === doc.documentElement ||
      element === doc.body
    ) {
      return;
    }

    seen.add(element);

    const measured = measure(element);
    const fill = measured && toRgba(measured.style.backgroundColor);

    if (!measured || !fill || fill.a === 0) {
      return;
    }

    const area = measured.rect.width * measured.rect.height;

    if (area > viewport * 0.5 && fill.a > 0.9) {
      if (!backdrop || area > backdrop.area) {
        backdrop = { fill, area };
      }
    } else if (area >= viewport * 0.01 && area <= viewport * 0.8) {
      cards.push({ fill, radius: radiusOf(measured), area: area * weight });
    }
  };

  if (hints.selectors?.card) {
    [...doc.querySelectorAll(hints.selectors.card)]
      .slice(0, MAX_HINTED)
      .forEach((element) => consider(element, 4));
  }

  for (let row = 0; row < GRID; row += 1) {
    for (let column = 0; column < GRID; column += 1) {
      const x = ((column + 0.5) / GRID) * window.innerWidth;
      const y = ((row + 0.5) / GRID) * window.innerHeight;

      doc
        .elementsFromPoint(x, y)
        .slice(0, 16)
        .forEach((element) => consider(element));
    }
  }

  return { cards, backdrop: backdrop?.fill };
};

/** The page's background, the element that paints it named. */
export const pageBackground = (
  doc: Document,
  backdrop: Rgba | undefined,
): { color: Rgba; source: string } | undefined => {
  const candidates = [
    doc.documentElement,
    doc.body,
    doc.querySelector('#__next, #root, #app'),
  ].filter((element): element is HTMLElement => !!element);

  const painted = candidates
    .map((element) => ({
      color: toRgba(getComputedStyle(element).backgroundColor),
      source: `computed:${element.id ? `#${element.id}` : element.tagName.toLowerCase()}`,
    }))
    .find(({ color }) => color && color.a > 0.5);

  if (painted?.color) {
    return { color: painted.color, source: painted.source };
  }

  if (backdrop) {
    return { color: backdrop, source: 'computed:backdrop' };
  }

  const meta = toRgba(
    doc.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  );

  return meta ? { color: meta, source: 'meta:theme-color' } : undefined;
};
