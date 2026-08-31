import { describe, expect, it } from 'vitest';

import {
  IN_FLIGHT_PHASES,
  isInFlightPhase,
  isTerminalPhase,
  PHASE_TRANSITIONS,
  TERMINAL_PHASES,
} from '@/machine/phases';

describe('IN_FLIGHT_PHASES', () => {
  it('counts every phase that is neither idle nor terminal', () => {
    // Derived, so a phase added to the transition table is in-flight by
    // construction rather than by remembering to list it.
    const expected = Object.keys(PHASE_TRANSITIONS).filter(
      (phase) => phase !== 'idle' && !TERMINAL_PHASES.includes(phase as never),
    );

    expect([...IN_FLIGHT_PHASES].sort()).toEqual(expected.sort());
  });

  it('treats expired as in flight', () => {
    // EXPIRED is not terminal: the settle loop keeps polling for a late
    // deposit that revives the execution, and prepareForNewFlow refuses a new
    // run from it — so a UI that read it as idle would offer a dead button.
    expect(isInFlightPhase('expired')).toBe(true);
    expect(isTerminalPhase('expired')).toBe(false);
  });

  it('excludes idle and the terminal phases', () => {
    expect(isInFlightPhase('idle')).toBe(false);

    TERMINAL_PHASES.forEach((phase) => {
      expect(isInFlightPhase(phase)).toBe(false);
    });
  });
});
