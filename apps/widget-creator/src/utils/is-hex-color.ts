export const isHexColor = (value: string): value is `#${string}` => {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
};
