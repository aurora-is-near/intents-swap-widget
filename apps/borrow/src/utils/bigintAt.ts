/** `values[index]` as a bigint; `fail()` is thrown for anything else. */
export const bigintAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): bigint => {
  const value = values[index];

  if (typeof value !== 'bigint') {
    throw fail();
  }

  return value;
};
