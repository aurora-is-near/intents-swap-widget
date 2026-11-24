import { describe, expect, it } from 'vitest';

import { markerPosition, toPercent, zoneWidths } from './sliderGeometry';

describe('zoneWidths', () => {
  it('makes each zone as wide as its share of the range', () => {
    // The artboard's LTV zones (Web-Borrow.dc.html line 304), max 90.
    const widths = zoneWidths(
      [
        { upTo: 50, color: 'a' },
        { upTo: 65, color: 'b' },
        { upTo: 80, color: 'c' },
        { upTo: 90, color: 'd' },
      ],
      0,
      90,
    );

    [50, 15, 15, 10].forEach((range, index) => {
      expect(widths[index]?.width).toBeCloseTo((range / 90) * 100);
    });

    expect(widths.map(({ color }) => color)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('measures zones from min and clamps them to max', () => {
    const widths = zoneWidths(
      [
        { upTo: 30, color: 'a' },
        { upTo: 50, color: 'b' },
        { upTo: 90, color: 'c' },
      ],
      20,
      60,
    );

    expect(widths.map(({ width }) => width)).toEqual([25, 50, 25]);
  });

  it('gives no width to a zone below the previous end or to an empty range', () => {
    expect(
      zoneWidths(
        [
          { upTo: 50, color: 'a' },
          { upTo: 40, color: 'b' },
        ],
        0,
        100,
      ).map(({ width }) => width),
    ).toEqual([50, 0]);
    expect(zoneWidths([{ upTo: 10, color: 'a' }], 5, 5)[0]?.width).toBe(0);
  });
});

describe('toPercent', () => {
  it('is (value − min) / (max − min) of the track', () => {
    expect(toPercent(83, 20, 90)).toBeCloseTo(((83 - 20) / (90 - 20)) * 100);
    expect(toPercent(83, 0, 90)).toBeCloseTo((83 / 90) * 100);
  });

  it('clamps to the track and handles an empty range', () => {
    expect(toPercent(10, 20, 90)).toBe(0);
    expect(toPercent(120, 20, 90)).toBe(100);
    expect(toPercent(5, 5, 5)).toBe(0);
  });
});

describe('markerPosition', () => {
  it('places from the inline start, centred by a translate that flips in RTL', () => {
    expect(markerPosition(80, false)).toEqual({
      insetInlineStart: '80%',
      translate: '-50% 0',
    });
    expect(markerPosition(80, true)).toEqual({
      insetInlineStart: '80%',
      translate: '50% 0',
    });
  });
});
