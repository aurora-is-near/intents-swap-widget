/** `values[index]` as a tuple (array); `fail()` is thrown for anything else. */
export const tupleAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): readonly unknown[] => {
  const value = values[index];

  if (!Array.isArray(value)) {
    throw fail();
  }

  return value;
};
