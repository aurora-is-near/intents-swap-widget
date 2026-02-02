export const getPercentFromBasisPoints = (fee: number) =>
  ((fee ?? 0) / 100).toFixed(2);
