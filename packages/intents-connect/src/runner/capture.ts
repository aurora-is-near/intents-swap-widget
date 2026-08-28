/**
 * Settlement capture for promises that are fired early and consumed later.
 *
 * A background round-trip started before its consumer is reached must never
 * become an unhandled rejection when the flow dies elsewhere first — so both
 * outcomes are folded into a value the consumer unwraps at its own await. The
 * `ok` tag is an explicit discriminant on purpose: key-presence checks break
 * silently the day a payload legitimately carries an `error` field.
 */
export type Captured<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export const capture = <T>(promise: Promise<T>): Promise<Captured<T>> =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

/** Rethrows a captured rejection at the consumer's own await site. */
export const unwrap = <T>(captured: Captured<T>): T => {
  if (!captured.ok) {
    throw captured.error;
  }

  return captured.value;
};
