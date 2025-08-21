export const isOnlyZerosAndDot = (str: string): boolean => {
  return /^0+(\.0+)?$/.test(str);
};
