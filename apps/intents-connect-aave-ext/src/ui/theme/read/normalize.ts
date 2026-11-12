import { parseColor, type Rgba } from '../color';

let context: CanvasRenderingContext2D | null | undefined;

const canvasContext = () => {
  if (context === undefined) {
    try {
      const canvas = document.createElement('canvas');

      canvas.width = 1;
      canvas.height = 1;
      context = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      context = null;
    }
  }

  return context;
};

/**
 * Any CSS color as sRGB: the pure parser first (hex, rgb, hsl, oklab,
 * oklch, display-p3), then a 1×1 canvas for the rest (lab, lch, names…),
 * clamped into sRGB. `undefined` for what isn't a color.
 */
export const toRgba = (value: string | null | undefined): Rgba | undefined => {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const parsed = parseColor(text);

  if (parsed) {
    return parsed;
  }

  const ctx = canvasContext();

  if (!ctx) {
    return undefined;
  }

  // An invalid color leaves fillStyle as it was: two sentinels tell.
  ctx.fillStyle = '#000000';
  ctx.fillStyle = text;
  const first = ctx.fillStyle;

  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = text;

  if (ctx.fillStyle !== first) {
    return undefined;
  }

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);

  const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;

  return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
};
