export const isValidFloat = (str: string): boolean => {
  return !Number.isNaN(parseFloat(str)) && Number.isFinite(Number(str));
};
