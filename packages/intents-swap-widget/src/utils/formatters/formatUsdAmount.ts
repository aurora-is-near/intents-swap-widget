const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const formatUsdAmount = (amount: number | bigint): string => {
  return usdFormatter.format(amount);
};
