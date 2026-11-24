/**
 * The New loan form's numbers as Web-Borrow.dc.html shows them, shared by
 * the form, the summary tiles and the call to action.
 */

export const USD_ROUND = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export const USD_CENTS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "≈ $7,200" as on line 1573 (whole dollars), cents below $100. */
export const formatUsd = (usd: number) =>
  `$${(usd >= 100 ? USD_ROUND : USD_CENTS).format(usd)}`;

/**
 * A token amount: whole units from 1,000 (as the artboard's "You receive",
 * line 1573), two decimals from 1, up to six below.
 */
const amountDigits = (value: number) => {
  if (value >= 1000) {
    return 0;
  }

  return value >= 1 ? 2 : 6;
};

export const formatAmount = (value: number) =>
  value.toLocaleString('en-US', {
    maximumFractionDigits: amountDigits(value),
  });
