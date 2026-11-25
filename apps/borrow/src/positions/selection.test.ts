import { describe, expect, it } from 'vitest';

import {
  ACTIVE_POSITION,
  AT_RISK_POSITION,
  REPAID_POSITION,
} from './positionFixtures';
import { defaultPosition, selectPosition } from './selection';

describe('defaultPosition', () => {
  it('prefers the first at-risk position', () => {
    expect(
      defaultPosition([ACTIVE_POSITION, REPAID_POSITION, AT_RISK_POSITION]),
    ).toBe(AT_RISK_POSITION);
  });

  it('is the first position when none is at risk', () => {
    expect(defaultPosition([REPAID_POSITION, ACTIVE_POSITION])).toBe(
      REPAID_POSITION,
    );
  });

  it('is undefined with no positions', () => {
    expect(defaultPosition([])).toBeUndefined();
  });
});

describe('selectPosition', () => {
  const positions = [ACTIVE_POSITION, AT_RISK_POSITION, REPAID_POSITION];

  it('is the position the id names', () => {
    expect(selectPosition(positions, REPAID_POSITION.id)).toBe(REPAID_POSITION);
  });

  it('is the default without an id, or with one naming no position', () => {
    expect(selectPosition(positions, undefined)).toBe(AT_RISK_POSITION);
    expect(selectPosition(positions, 'closed:loan')).toBe(AT_RISK_POSITION);
  });
});
