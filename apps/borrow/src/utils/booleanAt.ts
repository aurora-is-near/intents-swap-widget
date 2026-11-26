/** `values[index]` as a boolean; `fail()` is thrown for anything else. */
export const booleanAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): boolean => {
  const value = values[index];

  if (typeof value !== 'boolean') {
    throw fail();
  }

  return value;
};
