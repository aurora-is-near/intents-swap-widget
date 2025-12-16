import chroma from 'chroma-js';
import { Hsluv } from 'hsluv';
import { ColorPalette } from '../types/theme';

// All available stops (including 0 and 1000 for calculation)
const ALL_STOPS = [
  0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000,
] as const;

const LIGHTNESS_MIN = 0;
const LIGHTNESS_MAX = 100;

export type ColorStop = (typeof ALL_STOPS)[number];

/**
 * Chroma-js based implementation for stable palette generation.
 *
 * Based on the approach from tints.dev.
 * @see https://github.com/SimeonGriggs/tints.dev/blob/main/app/lib/createhexColors.ts
 */
export const createColorPalette = (
  baseColor: `#${string}`,
  mode: 'light' | 'dark',
  colorStop: ColorStop,
): ColorPalette => {
  const hueScale = ALL_STOPS.map((stop) => {
    const tweakValue = 0;

    return { stop, tweak: tweakValue };
  });

  // 2. Create saturation scale
  const saturationScale = ALL_STOPS.map((stop) => {
    const tweakValue = 0;

    return { stop, tweak: Math.min(tweakValue, 100) };
  });

  // 3. Create lightness distribution
  const hsluvLightness = new Hsluv();

  hsluvLightness.hex = baseColor;
  hsluvLightness.hexToHsluv();

  const lightnessValue = hsluvLightness.hsluv_l;

  // Create the three anchor points
  const distributionAnchors = [
    { stop: 0, tweak: LIGHTNESS_MAX },
    { stop: colorStop, tweak: lightnessValue },
    { stop: 1000, tweak: LIGHTNESS_MIN },
  ];

  // Interpolate for missing stops
  const distributionScale = ALL_STOPS.map((stop) => {
    // If it's an anchor point, use the anchor value
    const anchor = distributionAnchors.find((a) => a.stop === stop);

    if (anchor) {
      return anchor;
    }

    // Otherwise interpolate between anchor points
    let leftAnchor;
    let rightAnchor;

    if (stop < colorStop) {
      [leftAnchor, rightAnchor] = distributionAnchors;
    } else {
      [leftAnchor, rightAnchor] = distributionAnchors.slice(1);
    }

    if (!leftAnchor || !rightAnchor) {
      throw new Error('Invalid anchor points for interpolation');
    }

    // Linear interpolation
    const range = rightAnchor.stop - leftAnchor.stop;
    const position = stop - leftAnchor.stop;
    const ratio = position / range;
    const tweak =
      leftAnchor.tweak + (rightAnchor.tweak - leftAnchor.tweak) * ratio;

    return { stop, tweak: Math.round(tweak) };
  });

  const hexColors = ALL_STOPS.map((stop, stopIndex): string => {
    if (stop === colorStop) {
      return baseColor.toUpperCase();
    }

    // Get tweaks for this stop
    const hTweak = hueScale[stopIndex]?.tweak ?? 0;
    const sTweak = saturationScale[stopIndex]?.tweak ?? 0;
    const lTweak = distributionScale[stopIndex]?.tweak ?? 0;

    // HSLuv for perceived mode
    const hsluvPerceived = new Hsluv();

    hsluvPerceived.hex = baseColor;
    hsluvPerceived.hexToHsluv();

    // Handle grayscale colors in HSLuv (NaN hue)
    const normalizedHsluvH = Number.isNaN(hsluvPerceived.hsluv_h)
      ? 0
      : hsluvPerceived.hsluv_h;

    const newHsluvH = (normalizedHsluvH + hTweak) % 360;
    const newHsluvS = Math.max(
      0,
      Math.min(100, hsluvPerceived.hsluv_s + sTweak),
    );

    const newHsluvL = Math.max(0, Math.min(100, lTweak));

    hsluvPerceived.hsluv_h = newHsluvH;
    hsluvPerceived.hsluv_s = newHsluvS;
    hsluvPerceived.hsluv_l = newHsluvL;
    hsluvPerceived.hsluvToHex();

    const newColor = chroma(hsluvPerceived.hex);

    return newColor.hex().toUpperCase();
  });

  const themeValues = mode === 'dark' ? hexColors : [...hexColors].reverse();

  const getStopValue = (index: number): string => {
    const value = themeValues[index];

    if (!value) {
      throw new Error(`No color found for stop index: ${index}`);
    }

    return value;
  };

  return {
    50: getStopValue(1),
    100: getStopValue(2),
    200: getStopValue(3),
    300: getStopValue(4),
    400: getStopValue(5),
    500: getStopValue(6),
    600: getStopValue(7),
    700: getStopValue(8),
    800: getStopValue(9),
    900: getStopValue(10),
    950: getStopValue(11),
    975: getStopValue(12),
  };
};
