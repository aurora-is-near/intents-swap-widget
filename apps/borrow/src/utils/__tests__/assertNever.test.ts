import { describe, expect, it } from 'vitest';

import { assertNever } from '../assertNever';

describe('assertNever', () => {
  it('throws, naming what was unhandled and the value', () => {
    // A value the types ruled out, as one arriving from outside would.
    const value = 'surprise' as never;

    expect(() => assertNever(value, 'pending note')).toThrow(
      'Unhandled pending note: "surprise"',
    );
  });
});
