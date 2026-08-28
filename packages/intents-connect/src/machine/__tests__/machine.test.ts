import { describe, expect, it, vi } from 'vitest';

import { noopLogger } from '@/logger';
import { createExecutionMachine, moveTo } from '@/machine/machine';
import { PHASE_TRANSITIONS } from '@/machine/phases';

describe('createExecutionMachine', () => {
  it('starts idle', () => {
    expect(createExecutionMachine().current).toBe('idle');
  });

  it('returns an independent instance per call, so executions cannot share state', () => {
    const a = createExecutionMachine();
    const b = createExecutionMachine();

    moveTo(a, 'resolving-identity', { logger: noopLogger });

    expect(a.current).toBe('resolving-identity');
    expect(b.current).toBe('idle');
  });
});

describe('moveTo', () => {
  it('walks the happy bridge-in path', () => {
    const machine = createExecutionMachine();
    const phases = [
      'resolving-identity',
      'planning',
      'creating',
      'awaiting-signature',
      'submitting',
      'awaiting-deposit',
      'settling',
      'success',
    ] as const;

    phases.forEach((phase) => {
      expect(moveTo(machine, phase, { logger: noopLogger })).toBe(true);
    });

    expect(machine.current).toBe('success');
  });

  it('refuses and logs an illegal transition instead of throwing', () => {
    const machine = createExecutionMachine();
    const logger = { ...noopLogger, error: vi.fn() };

    // Nothing can succeed straight from idle — no execution exists yet.
    const moved = moveTo(machine, 'success', { logger });

    expect(moved).toBe(false);
    expect(machine.current).toBe('idle');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('from idle to success'),
    );
  });

  it.each(['awaiting-signature', 'awaiting-deposit', 'settling'] as const)(
    'allows idle → %s, which is how resume() re-enters mid-flow',
    (phase) => {
      const machine = createExecutionMachine();

      expect(moveTo(machine, phase, { logger: noopLogger })).toBe(true);
    },
  );

  it('allows idle → failed, so a first-call failure is recorded', () => {
    const machine = createExecutionMachine();

    expect(moveTo(machine, 'failed', { logger: noopLogger })).toBe(true);
  });

  it('treats a move to the current phase as a no-op success', () => {
    const machine = createExecutionMachine();

    expect(moveTo(machine, 'idle', { logger: noopLogger })).toBe(true);
  });

  it('notifies onMoved only for real transitions', () => {
    const machine = createExecutionMachine();
    const onMoved = vi.fn();

    moveTo(machine, 'resolving-identity', { logger: noopLogger, onMoved });
    moveTo(machine, 'resolving-identity', { logger: noopLogger, onMoved });

    expect(onMoved).toHaveBeenCalledTimes(1);
  });
});

describe('PHASE_TRANSITIONS', () => {
  it('lets submitting fork to either awaiting-deposit or settling', () => {
    // Out-operations answer SIGNING from /submit and skip the deposit phase.
    expect(PHASE_TRANSITIONS.submitting).toContain('awaiting-deposit');
    expect(PHASE_TRANSITIONS.submitting).toContain('settling');
  });

  it('allows expired to re-enter settling, because a late deposit revives it', () => {
    expect(PHASE_TRANSITIONS.settling).toContain('expired');
    expect(PHASE_TRANSITIONS.expired).toContain('settling');
  });

  it('lets settling be cancelled, which is when cancelling matters most', () => {
    expect(PHASE_TRANSITIONS.settling).toContain('cancelled');
  });

  it('keeps success, failed and cancelled absorbing', () => {
    expect(PHASE_TRANSITIONS.success).toHaveLength(0);
    expect(PHASE_TRANSITIONS.failed).toHaveLength(0);
    expect(PHASE_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it('round-trips settling → expired → settling on a live machine', () => {
    const machine = createExecutionMachine();

    (
      [
        'resolving-identity',
        'planning',
        'creating',
        'awaiting-signature',
        'submitting',
        'settling',
      ] as const
    ).forEach((phase) => moveTo(machine, phase, { logger: noopLogger }));

    expect(moveTo(machine, 'expired', { logger: noopLogger })).toBe(true);
    expect(moveTo(machine, 'settling', { logger: noopLogger })).toBe(true);
    expect(machine.current).toBe('settling');
  });
});
