export const getBasisPointsFromPercent = (fee: string) =>
  parseFloat(fee ?? '0') * 100;
