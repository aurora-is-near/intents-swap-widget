/**
 * The `default` of a `switch` that names every case of a union: a missing
 * case is a compile error here, and a value the types ruled out throws.
 */
export const assertNever = (value: never, what: string): never => {
  throw new Error(`Unhandled ${what}: ${JSON.stringify(value)}`);
};
