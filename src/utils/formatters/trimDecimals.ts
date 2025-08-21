export const trimDecimals = (str: string, decimals: number) => {
  if (!str.includes('.')) {
    return str;
  }

  const [intPart, decPart] = str.split('.');

  return `${intPart}.${(decPart ?? '0').substring(0, decimals)}`;
};
