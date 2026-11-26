/** A trimmed env value, or `undefined` when unset or empty. */
export const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();

  return trimmed === '' ? undefined : trimmed;
};
