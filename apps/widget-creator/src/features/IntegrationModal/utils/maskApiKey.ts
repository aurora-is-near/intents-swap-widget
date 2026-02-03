export const maskApiKey = (key: string) => {
  const firstChars = key.slice(0, 3);
  const lastChars = key.slice(-4);
  const dots = '•'.repeat(20);

  return `${firstChars}${dots}${lastChars}`;
};
