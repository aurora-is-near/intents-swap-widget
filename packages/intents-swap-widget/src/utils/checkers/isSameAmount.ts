// Ignores in-progress formatting (e.g. "1." or "1.50") so it compares equal to
// the normalised amount that comes back from the store ("1" or "1.5").
const normalise = (amount: string) =>
  amount.includes('.') ? amount.replace(/0+$/, '').replace(/\.$/, '') : amount;

export const isSameAmount = (a: string, b: string): boolean => {
  return normalise(a) === normalise(b);
};
