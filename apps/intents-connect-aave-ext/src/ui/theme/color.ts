/**
 * The color math a theme needs, with no dependency: parsing the forms
 * computed styles come in, OKLab for mixing (perceptually even steps), and
 * WCAG contrast. Channels are sRGB, 0–1.
 */
export type Rgba = { r: number; g: number; b: number; a: number };

type Oklab = { L: number; a: number; b: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
export const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 };

// --- sRGB transfer ---------------------------------------------------------

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

// --- OKLab (Björn Ottosson) --------------------------------------------------

export const toOklab = ({ r, g, b }: Rgba): Oklab => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );

  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );

  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

/** Back to sRGB, clamped into its gamut. */
const fromOklab = ({ L, a, b }: Oklab, alpha = 1): Rgba => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp01(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(
      toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    ),
    b: clamp01(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: clamp01(alpha),
  };
};

/** Perceptual distance; under ~0.02 is hard to tell apart. */
export const deltaE = (x: Rgba, y: Rgba): number => {
  const p = toOklab(x);
  const q = toOklab(y);

  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
};

/** `t` of the way from `from` to `to`, in OKLab (alpha mixed linearly). */
export const mix = (from: Rgba, to: Rgba, t: number): Rgba => {
  const p = toOklab(from);
  const q = toOklab(to);

  return fromOklab(
    {
      L: p.L + (q.L - p.L) * t,
      a: p.a + (q.a - p.a) * t,
      b: p.b + (q.b - p.b) * t,
    },
    from.a + (to.a - from.a) * t,
  );
};

export const withAlpha = (color: Rgba, a: number): Rgba => ({
  ...color,
  a: clamp01(a),
});

/** `color` painted over an opaque `under`. */
export const composite = (color: Rgba, under: Rgba): Rgba => ({
  r: color.r * color.a + under.r * (1 - color.a),
  g: color.g * color.a + under.g * (1 - color.a),
  b: color.b * color.a + under.b * (1 - color.a),
  a: 1,
});

/** OKLab lightness, 0–1. */
export const lightness = (color: Rgba): number => toOklab(color).L;

// --- WCAG contrast ---------------------------------------------------------------

/** Relative luminance (WCAG 2), of the color over white if translucent. */
const luminance = (color: Rgba): number => {
  const { r, g, b } = color.a < 1 ? composite(color, WHITE) : color;

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

/** WCAG contrast ratio, 1–21, of `fg` painted over `bg`. */
export const contrast = (fg: Rgba, bg: Rgba): number => {
  const ground = bg.a < 1 ? composite(bg, WHITE) : bg;
  const ink = fg.a < 1 ? composite(fg, ground) : fg;
  const [lighter, darker] = [luminance(ink), luminance(ground)].sort(
    (x, y) => y - x,
  );

  return (lighter! + 0.05) / (darker! + 0.05);
};

/**
 * `fg`, moved in OKLab lightness (hue and chroma kept) just far enough to
 * reach `min` contrast against every one of `backgrounds`. Black or white
 * when even that falls short.
 */
export const ensureContrast = (
  fg: Rgba,
  backgrounds: readonly Rgba[],
  min: number,
): Rgba => {
  if (backgrounds.every((bg) => contrast(fg, bg) >= min)) {
    return fg;
  }

  // A hair past the line, so rounding to 8-bit channels stays above it.
  const target = min + 0.03;
  const passes = (color: Rgba) =>
    backgrounds.every((bg) => contrast(color, bg) >= target);

  // Away from the backgrounds: lighter on dark ones, darker on light ones.
  const darkGround =
    backgrounds.reduce((sum, bg) => sum + luminance(bg), 0) /
      backgrounds.length <
    0.18;

  const lab = toOklab(fg);
  let near = lab.L;
  let far = darkGround ? 1 : 0;

  if (!passes(fromOklab({ ...lab, L: far }, fg.a))) {
    return darkGround ? WHITE : BLACK;
  }

  for (let step = 0; step < 24; step += 1) {
    const middle = (near + far) / 2;

    if (passes(fromOklab({ ...lab, L: middle }, fg.a))) {
      far = middle;
    } else {
      near = middle;
    }
  }

  return fromOklab({ ...lab, L: far }, fg.a);
};

/** Whichever of black and white reads better on `bg`. */
export const readableOn = (bg: Rgba): Rgba =>
  contrast(WHITE, bg) >= contrast(BLACK, bg) ? WHITE : BLACK;

// --- Parsing ------------------------------------------------------------------------

/** "50%" → 0.5 of `scale`; "128" → 128; "none" → 0. */
const number = (token: string, scale: number): number | undefined => {
  if (token === 'none') {
    return 0;
  }

  const value = Number.parseFloat(token);

  if (Number.isNaN(value)) {
    return undefined;
  }

  return token.endsWith('%') ? (value / 100) * scale : value;
};

/** The channels and alpha of `name(a b c / d)` or `name(a, b, c, d)`. */
const args = (body: string): { channels: string[]; alpha?: string } => {
  const [main = '', alpha] = body.split('/').map((part) => part.trim());
  const channels = main.split(/[\s,]+/).filter(Boolean);

  // The legacy comma form puts alpha fourth: `rgba(0, 0, 0, 0.5)`.
  if (alpha === undefined && channels.length === 4 && main.includes(',')) {
    return { channels: channels.slice(0, 3), alpha: channels[3] };
  }

  return { channels, alpha };
};

const alphaOf = (token: string | undefined): number =>
  token === undefined ? 1 : clamp01(number(token, 1) ?? 1);

const hslToRgb = (
  h: number,
  s: number,
  l: number,
): [number, number, number] => {
  const k = (n: number) => (n + h / 30) % 12;
  const chroma = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - chroma * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

  return [f(0), f(8), f(4)];
};

/** Display P3 (linear) to sRGB (linear). Both use sRGB's transfer curve. */
const p3ToSrgb = (r: number, g: number, b: number) => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  return [
    1.2249401 * lr - 0.2249404 * lg,
    -0.0420569 * lr + 1.0420571 * lg,
    -0.0196376 * lr - 0.0786361 * lg + 1.0982735 * lb,
  ].map((c) => clamp01(toGamma(c))) as [number, number, number];
};

/** Older spellings of the color functions. */
const ALIASES: Readonly<Record<string, string>> = { rgba: 'rgb', hsla: 'hsl' };

const NAMED: Readonly<Record<string, Rgba>> = {
  black: BLACK,
  white: WHITE,
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

/**
 * A CSS color as computed styles and design systems write it: hex, `rgb()`,
 * `hsl()`, `oklab()`, `oklch()`, `color(srgb|display-p3 …)`, and the names
 * black, white and transparent. Anything else is `undefined`; the page
 * reader normalizes those through a canvas.
 */
export const parseColor = (input: string): Rgba | undefined => {
  const value = input.trim().toLowerCase();

  if (NAMED[value]) {
    return NAMED[value];
  }

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full =
      hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;

    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(full)) {
      return undefined;
    }

    const byte = (at: number) =>
      Number.parseInt(full.slice(at, at + 2), 16) / 255;

    return {
      r: byte(0),
      g: byte(2),
      b: byte(4),
      a: full.length === 8 ? byte(6) : 1,
    };
  }

  const match = /^([a-z-]+)\((.*)\)$/.exec(value);

  if (!match) {
    return undefined;
  }

  const [, name, body = ''] = match;
  const { channels, alpha } = args(body);
  const a = alphaOf(alpha);
  // `rgba()` and `hsla()` are older spellings of `rgb()` and `hsl()`.
  const kind = ALIASES[name ?? ''] ?? name;

  switch (kind) {
    case 'rgb': {
      const [r, g, b] = channels.map((token) => number(token, 255));

      return r === undefined || g === undefined || b === undefined
        ? undefined
        : { r: clamp01(r / 255), g: clamp01(g / 255), b: clamp01(b / 255), a };
    }

    case 'hsl': {
      // Saturation and lightness are percentages, with or without the sign.
      const percent = (token: string) =>
        token.endsWith('%')
          ? number(token, 1)
          : (number(token, 1) ?? NaN) / 100;

      const h = Number.parseFloat(channels[0] ?? '');
      const s = percent(channels[1] ?? '');
      const l = percent(channels[2] ?? '');

      if (
        Number.isNaN(h) ||
        s === undefined ||
        l === undefined ||
        Number.isNaN(s) ||
        Number.isNaN(l)
      ) {
        return undefined;
      }

      const [r, g, b] = hslToRgb(
        ((h % 360) + 360) % 360,
        clamp01(s),
        clamp01(l),
      );

      return { r, g, b, a };
    }

    case 'oklab': {
      const [L, x, y] = [
        number(channels[0] ?? '', 1),
        number(channels[1] ?? '', 0.4),
        number(channels[2] ?? '', 0.4),
      ];

      return L === undefined || x === undefined || y === undefined
        ? undefined
        : fromOklab({ L, a: x, b: y }, a);
    }

    case 'oklch': {
      const L = number(channels[0] ?? '', 1);
      const C = number(channels[1] ?? '', 0.4);
      const h = Number.parseFloat(channels[2] ?? '');

      if (L === undefined || C === undefined || Number.isNaN(h)) {
        return undefined;
      }

      const radians = (h * Math.PI) / 180;

      return fromOklab(
        { L, a: C * Math.cos(radians), b: C * Math.sin(radians) },
        a,
      );
    }

    case 'color': {
      const [space, ...rest] = channels;
      const [r, g, b] = rest.map((token) => number(token, 1));

      if (r === undefined || g === undefined || b === undefined) {
        return undefined;
      }

      if (space === 'srgb') {
        return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a };
      }

      if (space === 'display-p3') {
        const [sr, sg, sb] = p3ToSrgb(r, g, b);

        return { r: sr, g: sg, b: sb, a };
      }

      return undefined;
    }

    default:
      return undefined;
  }
};

const byte = (channel: number) => Math.round(clamp01(channel) * 255);

/** `#rrggbb` when opaque, `rgba(r, g, b, a)` otherwise. */
export const formatColor = (color: Rgba): string => {
  if (color.a >= 1) {
    return `#${[color.r, color.g, color.b]
      .map((channel) => byte(channel).toString(16).padStart(2, '0'))
      .join('')}`;
  }

  return `rgba(${byte(color.r)}, ${byte(color.g)}, ${byte(color.b)}, ${
    Math.round(color.a * 1000) / 1000
  })`;
};
