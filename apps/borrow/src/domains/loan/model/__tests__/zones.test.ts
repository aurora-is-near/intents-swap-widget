import { describe, expect, it } from 'vitest';

import { LTV_MAX, LTV_MIN, LTV_STEP, LTV_ZONES, zoneOf } from '../zones';

describe('zoneOf', () => {
  it.each([
    [0, 'Conservative'],
    [49, 'Conservative'],
    [50, 'Moderate'],
    [64, 'Moderate'],
    [65, 'Aggressive'],
    [79, 'Aggressive'],
    [80, 'Near liquidation'],
    [90, 'Near liquidation'],
  ])('puts %i%% in %s', (ltv, zone) => {
    expect(zoneOf(ltv)).toBe(zone);
  });

  it('keeps an LTV past the slider’s end in the last zone', () => {
    expect(zoneOf(95)).toBe('Near liquidation');
  });
});

describe('the LTV slider', () => {
  it('runs 0 to 90 in steps of 1, with zones ending at 50, 65, 80 and 90', () => {
    expect([LTV_MIN, LTV_MAX, LTV_STEP]).toEqual([0, 90, 1]);
    expect(LTV_ZONES.map(({ upTo }) => upTo)).toEqual([50, 65, 80, 90]);
  });
});
