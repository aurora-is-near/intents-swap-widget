export const getBasisPointsFromPercent = (fee: string) => {
  // The masked input can emit non-numeric values (e.g. a lone "%"), which
  // would otherwise propagate NaN into the fee split and JSON config.
  const parsed = parseFloat(fee);

  return Number.isFinite(parsed) ? parsed * 100 : 0;
};
